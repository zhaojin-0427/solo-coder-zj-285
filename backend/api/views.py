from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg, Count, Q, F
from django.db.models.functions import TruncDate
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date, timedelta
import math

from .models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review
)
from .serializers import (
    UserSerializer, UserProfileSerializer, CaregiverProfileSerializer,
    PetSerializer, FosterRequestSerializer, OrderSerializer,
    DailyRecordSerializer, ReviewSerializer
)


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        try:
            user = User.objects.get(username=username)
            profile, created = UserProfile.objects.get_or_create(user=user)
            return Response({
                'success': True,
                'user': UserSerializer(user).data,
                'profile': UserProfileSerializer(profile).data
            })
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=username,
                password=password or '123456',
                email=request.data.get('email', '')
            )
            profile = UserProfile.objects.create(
                user=user,
                role=request.data.get('role', 'owner'),
                district=request.data.get('district', '朝阳区望京'),
                latitude=request.data.get('latitude', 39.9042),
                longitude=request.data.get('longitude', 116.4074),
            )
            return Response({
                'success': True,
                'user': UserSerializer(user).data,
                'profile': UserProfileSerializer(profile).data
            }, status=status.HTTP_201_CREATED)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'district']


class CaregiverProfileViewSet(viewsets.ModelViewSet):
    queryset = CaregiverProfile.objects.all()
    serializer_class = CaregiverProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['experience', 'is_verified']
    ordering_fields = ['rating', 'review_count', 'price_per_day', 'completed_orders']

    @action(detail=False, methods=['get'])
    def match(self, request):
        request_id = request.query_params.get('request_id')
        lat = float(request.query_params.get('latitude', 39.9042))
        lon = float(request.query_params.get('longitude', 116.4074))
        pet_type = request.query_params.get('pet_type', 'dog')
        services = request.query_params.getlist('services')
        budget = float(request.query_params.get('budget', 200))

        caregivers = CaregiverProfile.objects.filter(
            price_per_day__lte=budget,
            is_verified=True
        ).select_related('user_profile')

        results = []
        for cg in caregivers:
            if pet_type and pet_type not in cg.pet_types and cg.pet_types:
                continue
            service_match = True
            if services:
                service_match = any(s in cg.service_types for s in services)
            if not service_match:
                continue

            distance = calculate_distance(
                lat, lon,
                cg.user_profile.latitude, cg.user_profile.longitude
            )
            score = 100
            score -= distance * 2
            score += cg.rating * 5
            if cg.completed_orders > 10:
                score += 10
            if cg.review_count > 5:
                score += 5
            if budget >= cg.price_per_day * 1.2:
                score += 10

            cg.match_score = max(0, score)
            results.append(cg)

        results.sort(key=lambda x: x.match_score, reverse=True)
        serializer = CaregiverProfileSerializer(results[:10], many=True)
        return Response(serializer.data)


class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['owner', 'pet_type', 'breed']


class FosterRequestViewSet(viewsets.ModelViewSet):
    queryset = FosterRequest.objects.all()
    serializer_class = FosterRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['owner', 'status', 'district']
    ordering_fields = ['created_at', 'budget']

    @action(detail=True, methods=['post'])
    def confirm_match(self, request, pk=None):
        foster_request = self.get_object()
        caregiver_id = request.data.get('caregiver_id')
        try:
            caregiver = CaregiverProfile.objects.get(id=caregiver_id)
            foster_request.matched_caregiver = caregiver
            foster_request.status = 'matched'
            foster_request.save()

            days = (foster_request.end_date - foster_request.start_date).days + 1
            total_price = days * float(caregiver.price_per_day)

            order = Order.objects.create(
                foster_request=foster_request,
                owner=foster_request.owner,
                caregiver=caregiver.user_profile.user,
                total_price=total_price,
                status='pending',
                start_date=foster_request.start_date,
                end_date=foster_request.end_date,
            )
            foster_request.status = 'confirmed'
            foster_request.save()

            return Response({
                'success': True,
                'order': OrderSerializer(order).data
            })
        except CaregiverProfile.DoesNotExist:
            return Response(
                {'success': False, 'error': '代养人不存在'},
                status=status.HTTP_400_BAD_REQUEST
            )


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['owner', 'caregiver', 'status']

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        order = self.get_object()
        order.status = 'active'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        order = self.get_object()
        order.status = 'completed'
        order.save()
        if order.caregiver.profile.caregiver:
            cg = order.caregiver.profile.caregiver
            cg.completed_orders = F('completed_orders') + 1
            cg.save()
        return Response(OrderSerializer(order).data)


class DailyRecordViewSet(viewsets.ModelViewSet):
    queryset = DailyRecord.objects.all()
    serializer_class = DailyRecordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'caregiver', 'record_date', 'abnormal_behavior']


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'reviewer', 'reviewee', 'role']

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        review = Review.objects.get(id=response.data['id'])
        order = review.order
        if review.role == 'owner':
            order.owner_reviewed = True
        else:
            order.caregiver_reviewed = True
        order.save()

        reviewee_profile = review.reviewee.profile
        if hasattr(reviewee_profile, 'caregiver'):
            cg = reviewee_profile.caregiver
            avg_rating = Review.objects.filter(
                reviewee=review.reviewee
            ).aggregate(avg=Avg('rating'))['avg'] or 0
            count = Review.objects.filter(reviewee=review.reviewee).count()
            cg.rating = round(avg_rating, 2)
            cg.review_count = count
            cg.save()

        return response


class StatisticsView(APIView):
    def get(self, request):
        total_orders = Order.objects.count()
        completed_orders = Order.objects.filter(status='completed').count()
        completion_rate = round(completed_orders / total_orders * 100, 2) if total_orders > 0 else 0

        district_activity = list(
            UserProfile.objects.values('district')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        district_orders = list(
            FosterRequest.objects.values('district')
            .annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed'))
            )
            .order_by('-total')[:10]
        )

        top_caregivers = list(
            CaregiverProfile.objects.filter(review_count__gt=0)
            .select_related('user_profile__user')
            .order_by('-rating', '-review_count')[:5]
            .values(
                'id', 'rating', 'review_count', 'completed_orders',
                username=F('user_profile__user__username'),
                district=F('user_profile__district')
            )
        )

        total_records = DailyRecord.objects.count()
        abnormal_records = DailyRecord.objects.filter(abnormal_behavior=True).count()
        abnormal_rate = round(abnormal_records / total_records * 100, 2) if total_records > 0 else 0

        abnormal_by_type = list(
            DailyRecord.objects.filter(abnormal_behavior=True)
            .values(order_pet_type=F('order__foster_request__pet__pet_type'))
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        order_trend = list(
            Order.objects.annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')[:30]
        )

        avg_reviews = list(
            Review.objects.values('role')
            .annotate(avg_rating=Avg('rating'), count=Count('id'))
        )

        return Response({
            'overview': {
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'completion_rate': completion_rate,
                'total_pets': Pet.objects.count(),
                'total_caregivers': CaregiverProfile.objects.count(),
                'total_users': UserProfile.objects.count(),
                'abnormal_rate': abnormal_rate,
                'abnormal_records': abnormal_records,
                'total_records': total_records,
            },
            'district_activity': district_activity,
            'district_orders': district_orders,
            'top_caregivers': top_caregivers,
            'abnormal_by_type': abnormal_by_type,
            'order_trend': order_trend,
            'avg_reviews': avg_reviews,
        })
