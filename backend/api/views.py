from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg, Count, Q, F, ExpressionWrapper, DurationField, FloatField
from django.db.models.functions import TruncDate
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date, timedelta, datetime
import math

from .models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review, OrderChange, Dispute, DisputeMessage
)
from .serializers import (
    UserSerializer, UserProfileSerializer, CaregiverProfileSerializer,
    PetSerializer, FosterRequestSerializer, OrderSerializer,
    DailyRecordSerializer, ReviewSerializer, OrderChangeSerializer,
    DisputeSerializer, DisputeMessageSerializer
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
        if order.disputes.filter(status='open').exists():
            return Response(
                {'success': False, 'error': '存在未关闭的争议，请先协商解决后再完成订单'},
                status=status.HTTP_400_BAD_REQUEST
            )
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

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        record = DailyRecord.objects.get(id=response.data['id'])
        self._check_and_trigger_escalation(record.order)
        return response

    def _check_and_trigger_escalation(self, order):
        records = DailyRecord.objects.filter(order=order).order_by('-record_date')[:3]
        if records.count() < 3:
            return

        records_list = list(records)
        abnormal_count = sum(1 for r in records_list if r.abnormal_behavior)
        feeding_missing_count = sum(1 for r in records_list if not r.feeding_info or len(r.feeding_info.strip()) < 5)
        photo_missing_count = sum(1 for r in records_list if not r.photos or len(r.photos) == 0)

        trigger_type = None
        title = ''
        description = ''

        if abnormal_count >= 3:
            trigger_type = 'abnormal_behavior'
            title = '连续异常行为警报'
            description = f'订单 #{order.id} 最近3天每日记录均出现异常行为，已触发自动升级。请双方尽快协商解决。'
        elif feeding_missing_count >= 3:
            trigger_type = 'feeding_missing'
            title = '连续喂养信息缺失警报'
            description = f'订单 #{order.id} 最近3天每日记录喂养信息严重缺失，已触发自动升级。请双方尽快协商解决。'
        elif photo_missing_count >= 3:
            trigger_type = 'photo_missing'
            title = '连续照片缺失警报'
            description = f'订单 #{order.id} 最近3天每日记录均未上传照片，已触发自动升级。请双方尽快协商解决。'

        if trigger_type and not order.disputes.filter(status='open').exists():
            initiator = order.owner
            dispute = Dispute.objects.create(
                order=order,
                initiator=initiator,
                status='open',
                trigger_type=trigger_type,
                title=title,
                description=description,
                escalation_alert_sent=True,
            )
            DisputeMessage.objects.create(
                dispute=dispute,
                sender=None,
                sender_role='system',
                content=description,
                is_system=True,
            )
            order.status = 'disputed'
            order.save()


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'reviewer', 'reviewee', 'role']

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        try:
            order = Order.objects.get(id=order_id)
            if order.disputes.filter(status='open').exists():
                return Response(
                    {'success': False, 'error': '存在未关闭的争议，请先协商解决后再进行评价'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Order.DoesNotExist:
            pass

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


class OrderChangeViewSet(viewsets.ModelViewSet):
    queryset = OrderChange.objects.all()
    serializer_class = OrderChangeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'initiator', 'change_type', 'status']

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        try:
            order = Order.objects.get(id=order_id)
            if order.status not in ['pending', 'active']:
                return Response(
                    {'success': False, 'error': '只能在待确认或进行中的订单发起变更'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Order.DoesNotExist:
            return Response(
                {'success': False, 'error': '订单不存在'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()
        change_type = data.get('change_type')

        if change_type == 'reschedule':
            data['original_start_date'] = order.start_date
            data['original_end_date'] = order.end_date
            if data.get('new_start_date') and data.get('new_end_date'):
                from datetime import datetime
                ns = datetime.strptime(data['new_start_date'], '%Y-%m-%d').date()
                ne = datetime.strptime(data['new_end_date'], '%Y-%m-%d').date()
                old_days = (order.end_date - order.start_date).days + 1
                new_days = (ne - ns).days + 1
                price_per_day = float(order.total_price) / old_days if old_days > 0 else 0
                data['original_price'] = float(order.total_price)
                data['new_price'] = round(new_days * price_per_day, 2)
                data['price_diff'] = round(data['new_price'] - data['original_price'], 2)
        elif change_type == 'services':
            data['original_services'] = order.services
            price_per_service = 20
            old_count = len(order.services)
            new_count = len(data.get('new_services', []))
            data['original_price'] = float(order.total_price)
            data['price_diff'] = round((new_count - old_count) * price_per_service, 2)
            data['new_price'] = round(data['original_price'] + data['price_diff'], 2)
        elif change_type == 'transport':
            data['original_transport'] = order.transport
            data['original_price'] = float(order.total_price)
            data['new_price'] = float(order.total_price)
            data['price_diff'] = 0
        elif change_type == 'price':
            data['original_price'] = float(order.total_price)

        data['initiator'] = request.user.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        change = self.get_object()
        if change.status != 'pending':
            return Response(
                {'success': False, 'error': '该变更单已处理，无法重复确认'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order = change.order
        if change.initiator_id == request.user.id:
            return Response(
                {'success': False, 'error': '发起人不能确认自己的变更申请'},
                status=status.HTTP_400_BAD_REQUEST
            )

        change.status = 'approved'
        change.confirmed_at = datetime.now()
        change.confirmed_by = request.user
        change.save()

        if change.change_type == 'reschedule':
            if change.new_start_date:
                order.start_date = change.new_start_date
            if change.new_end_date:
                order.end_date = change.new_end_date
            if change.new_price is not None:
                order.total_price = change.new_price
        elif change.change_type == 'services':
            if change.new_services:
                order.services = change.new_services
            if change.new_price is not None:
                order.total_price = change.new_price
            if change.foster_request:
                fr = order.foster_request
                if change.new_services:
                    fr.services = change.new_services
                    fr.save()
        elif change.change_type == 'transport':
            if change.new_transport:
                order.transport = change.new_transport
        elif change.change_type == 'price':
            if change.new_price is not None:
                order.total_price = change.new_price

        order.save()
        return Response({'success': True, 'order': OrderSerializer(order).data, 'change': OrderChangeSerializer(change).data})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        change = self.get_object()
        if change.status != 'pending':
            return Response(
                {'success': False, 'error': '该变更单已处理'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if change.initiator_id == request.user.id:
            return Response(
                {'success': False, 'error': '发起人不能拒绝自己的变更申请'},
                status=status.HTTP_400_BAD_REQUEST
            )
        change.status = 'rejected'
        change.reject_reason = request.data.get('reject_reason', '')
        change.save()
        return Response({'success': True, 'change': OrderChangeSerializer(change).data})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        change = self.get_object()
        if change.status != 'pending':
            return Response(
                {'success': False, 'error': '该变更单已处理，无法取消'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if change.initiator_id != request.user.id:
            return Response(
                {'success': False, 'error': '只有发起人可以取消变更申请'},
                status=status.HTTP_400_BAD_REQUEST
            )
        change.status = 'cancelled'
        change.save()
        return Response({'success': True, 'change': OrderChangeSerializer(change).data})


class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.all()
    serializer_class = DisputeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'initiator', 'status', 'trigger_type']

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {'success': False, 'error': '订单不存在'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()
        data['initiator'] = request.user.id
        data['trigger_type'] = data.get('trigger_type', 'manual')
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        dispute = serializer.save()

        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            sender_role='owner' if order.owner_id == request.user.id else 'caregiver',
            content=dispute.description,
            is_system=False,
        )

        order.status = 'disputed'
        order.save()

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        dispute = self.get_object()
        if dispute.status != 'open':
            return Response(
                {'success': False, 'error': '争议已关闭，无法添加消息'},
                status=status.HTTP_400_BAD_REQUEST
            )
        order = dispute.order
        sender_role = 'owner' if order.owner_id == request.user.id else 'caregiver'
        msg = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            sender_role=sender_role,
            content=request.data.get('content', ''),
            is_system=False,
        )
        return Response({'success': True, 'message': DisputeMessageSerializer(msg).data})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        dispute = self.get_object()
        if dispute.status != 'open':
            return Response(
                {'success': False, 'error': '争议已处理'},
                status=status.HTTP_400_BAD_REQUEST
            )
        dispute.status = 'resolved'
        dispute.resolved_at = datetime.now()
        dispute.resolved_by = request.user
        dispute.resolution = request.data.get('resolution', '')
        dispute.save()

        order = dispute.order
        if order.status == 'disputed':
            order.status = 'active'
            order.save()

        DisputeMessage.objects.create(
            dispute=dispute,
            sender=None,
            sender_role='system',
            content=f'争议已解决。解决方案：{dispute.resolution}',
            is_system=True,
        )
        return Response({'success': True, 'dispute': DisputeSerializer(dispute).data})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        dispute = self.get_object()
        if dispute.status != 'open':
            return Response(
                {'success': False, 'error': '争议已处理'},
                status=status.HTTP_400_BAD_REQUEST
            )
        dispute.status = 'closed'
        dispute.resolved_at = datetime.now()
        dispute.resolved_by = request.user
        dispute.resolution = request.data.get('resolution', '双方协商关闭')
        dispute.save()

        order = dispute.order
        if order.status == 'disputed':
            order.status = 'active'
            order.save()

        DisputeMessage.objects.create(
            dispute=dispute,
            sender=None,
            sender_role='system',
            content='争议已关闭。',
            is_system=True,
        )
        return Response({'success': True, 'dispute': DisputeSerializer(dispute).data})


class StatisticsView(APIView):
    def get(self, request):
        district = request.query_params.get('district')

        orders_qs = Order.objects.all()
        fr_qs = FosterRequest.objects.all()
        records_qs = DailyRecord.objects.all()
        changes_qs = OrderChange.objects.all()
        disputes_qs = Dispute.objects.all()
        reviews_qs = Review.objects.all()

        if district:
            orders_qs = orders_qs.filter(foster_request__district=district)
            fr_qs = fr_qs.filter(district=district)
            order_ids = orders_qs.values_list('id', flat=True)
            records_qs = records_qs.filter(order_id__in=order_ids)
            changes_qs = changes_qs.filter(order_id__in=order_ids)
            disputes_qs = disputes_qs.filter(order_id__in=order_ids)
            reviews_qs = reviews_qs.filter(order_id__in=order_ids)

        total_orders = orders_qs.count()
        completed_orders = orders_qs.filter(status='completed').count()
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

        top_caregivers_qs = CaregiverProfile.objects.filter(review_count__gt=0)
        if district:
            top_caregivers_qs = top_caregivers_qs.filter(user_profile__district=district)
        top_caregivers = list(
            top_caregivers_qs
            .select_related('user_profile__user')
            .order_by('-rating', '-review_count')[:5]
            .values(
                'id', 'rating', 'review_count', 'completed_orders',
                username=F('user_profile__user__username'),
                district=F('user_profile__district')
            )
        )

        total_records = records_qs.count()
        abnormal_records = records_qs.filter(abnormal_behavior=True).count()
        abnormal_rate = round(abnormal_records / total_records * 100, 2) if total_records > 0 else 0

        abnormal_by_type = list(
            records_qs.filter(abnormal_behavior=True)
            .values(order_pet_type=F('order__foster_request__pet__pet_type'))
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        order_trend = list(
            orders_qs.annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')[:30]
        )

        avg_reviews = list(
            reviews_qs.values('role')
            .annotate(avg_rating=Avg('rating'), count=Count('id'))
        )

        total_changes = changes_qs.count()
        approved_changes = changes_qs.filter(status='approved').count()
        change_success_rate = round(approved_changes / total_changes * 100, 2) if total_changes > 0 else 0

        total_orders_for_dispute = orders_qs.count()
        disputed_orders = orders_qs.filter(disputes__isnull=False).distinct().count()
        dispute_rate = round(disputed_orders / total_orders_for_dispute * 100, 2) if total_orders_for_dispute > 0 else 0

        resolved_disputes = disputes_qs.filter(status__in=['resolved', 'closed'])
        avg_negotiation_hours = 0
        if resolved_disputes.exists():
            total_hours = 0
            count = 0
            for d in resolved_disputes:
                if d.resolved_at and d.opened_at:
                    delta = d.resolved_at - d.opened_at
                    total_hours += delta.total_seconds() / 3600
                    count += 1
            avg_negotiation_hours = round(total_hours / count, 2) if count > 0 else 0

        escalated_disputes = disputes_qs.exclude(trigger_type='manual')
        escalated_count = escalated_disputes.count()
        escalated_resolved = escalated_disputes.filter(status__in=['resolved', 'closed']).count()
        escalation_resolution_rate = round(escalated_resolved / escalated_count * 100, 2) if escalated_count > 0 else 0

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
                'change_success_rate': change_success_rate,
                'total_changes': total_changes,
                'approved_changes': approved_changes,
                'dispute_rate': dispute_rate,
                'disputed_orders': disputed_orders,
                'avg_negotiation_hours': avg_negotiation_hours,
                'escalation_resolution_rate': escalation_resolution_rate,
                'escalated_count': escalated_count,
                'escalated_resolved': escalated_resolved,
            },
            'district_activity': district_activity,
            'district_orders': district_orders,
            'top_caregivers': top_caregivers,
            'abnormal_by_type': abnormal_by_type,
            'order_trend': order_trend,
            'avg_reviews': avg_reviews,
            'current_district': district,
        })
