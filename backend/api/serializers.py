from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review, OrderChange, Dispute, DisputeMessage,
    Handover, Escrow, RefundRequest
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserProfile
        fields = '__all__'


class CaregiverProfileSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(read_only=True)
    user_profile_id = serializers.IntegerField(write_only=True)
    username = serializers.CharField(source='user_profile.user.username', read_only=True)
    district = serializers.CharField(source='user_profile.district', read_only=True)
    avatar = serializers.ImageField(source='user_profile.avatar', read_only=True)
    bio = serializers.CharField(source='user_profile.bio', read_only=True)
    match_score = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = CaregiverProfile
        fields = '__all__'


class PetSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Pet
        fields = '__all__'


class FosterRequestSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    pet_info = PetSerializer(source='pet', read_only=True)
    matched_caregiver_info = CaregiverProfileSerializer(
        source='matched_caregiver', read_only=True
    )

    class Meta:
        model = FosterRequest
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    caregiver_name = serializers.CharField(source='caregiver.username', read_only=True)
    foster_request_info = FosterRequestSerializer(source='foster_request', read_only=True)
    transport_display = serializers.CharField(source='get_transport_display', read_only=True)
    has_open_dispute = serializers.SerializerMethodField()
    handovers = serializers.SerializerMethodField()
    latest_start_handover = serializers.SerializerMethodField()
    can_start_service = serializers.SerializerMethodField()
    escrow = serializers.SerializerMethodField()
    escrow_info = serializers.SerializerMethodField()
    can_settle = serializers.SerializerMethodField()
    settlement_blocked_reasons = serializers.SerializerMethodField()
    refund_requests = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'

    def get_has_open_dispute(self, obj):
        return obj.disputes.filter(status='open').exists()

    def get_handovers(self, obj):
        from .models import Handover
        handovers = obj.handovers.all()
        return HandoverSerializer(handovers, many=True).data

    def get_latest_start_handover(self, obj):
        from .models import Handover
        handover = obj.handovers.filter(stage='start').order_by('-created_at').first()
        return HandoverSerializer(handover).data if handover else None

    def get_can_start_service(self, obj):
        from .models import Handover
        if obj.status == 'pending':
            start_handover = obj.handovers.filter(stage='start', status='confirmed').first()
            return start_handover is not None
        return False

    def get_escrow(self, obj):
        from .models import Escrow
        escrow = getattr(obj, 'escrow', None)
        return EscrowSerializer(escrow).data if escrow else None

    def get_escrow_info(self, obj):
        from .models import Escrow
        escrow = getattr(obj, 'escrow', None)
        if not escrow:
            return None
        return {
            'id': escrow.id,
            'status': escrow.status,
            'status_display': escrow.get_status_display(),
            'total_amount': float(escrow.total_amount),
            'platform_fee': float(escrow.platform_fee),
            'caregiver_amount': float(escrow.caregiver_amount),
            'refund_amount': float(escrow.refund_amount),
            'paid_at': escrow.paid_at.isoformat() if escrow.paid_at else None,
            'settled_at': escrow.settled_at.isoformat() if escrow.settled_at else None,
            'refunded_at': escrow.refunded_at.isoformat() if escrow.refunded_at else None,
        }

    def get_can_settle(self, obj):
        from .models import Escrow
        escrow = getattr(obj, 'escrow', None)
        return escrow.can_settle if escrow else False

    def get_settlement_blocked_reasons(self, obj):
        from .models import Escrow
        escrow = getattr(obj, 'escrow', None)
        return escrow.settlement_blocked_reasons if escrow else []

    def get_refund_requests(self, obj):
        from .models import RefundRequest
        requests = obj.refund_requests.all()
        return RefundRequestSerializer(requests, many=True).data


class DailyRecordSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.CharField(source='caregiver.username', read_only=True)

    class Meta:
        model = DailyRecord
        fields = '__all__'


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    reviewee_name = serializers.CharField(source='reviewee.username', read_only=True)

    class Meta:
        model = Review
        fields = '__all__'


class OrderChangeSerializer(serializers.ModelSerializer):
    initiator_name = serializers.CharField(source='initiator.username', read_only=True)
    confirmed_by_name = serializers.CharField(source='confirmed_by.username', read_only=True, allow_null=True)
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    original_transport_display = serializers.CharField(source='get_original_transport_display', read_only=True, allow_null=True)
    new_transport_display = serializers.CharField(source='get_new_transport_display', read_only=True, allow_null=True)

    class Meta:
        model = OrderChange
        fields = '__all__'
        read_only_fields = ['initiator', 'status', 'confirmed_at', 'confirmed_by']


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True, allow_null=True)
    sender_role_display = serializers.CharField(source='get_sender_role_display', read_only=True)

    class Meta:
        model = DisputeMessage
        fields = '__all__'


class DisputeSerializer(serializers.ModelSerializer):
    initiator_name = serializers.CharField(source='initiator.username', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.username', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    messages = DisputeMessageSerializer(many=True, read_only=True)
    order_info = OrderSerializer(source='order', read_only=True)

    class Meta:
        model = Dispute
        fields = '__all__'
        read_only_fields = ['initiator', 'status', 'opened_at', 'escalation_alert_sent']


class HandoverSerializer(serializers.ModelSerializer):
    order_info = OrderSerializer(source='order', read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    related_dispute_info = DisputeSerializer(source='related_dispute', read_only=True, allow_null=True)
    is_editable = serializers.BooleanField(read_only=True)

    class Meta:
        model = Handover
        fields = '__all__'
        read_only_fields = [
            'status', 'owner_confirmed', 'caregiver_confirmed',
            'owner_confirmed_at', 'caregiver_confirmed_at', 'confirmed_at',
            'created_by', 'related_dispute', 'has_discrepancies'
        ]


class EscrowSerializer(serializers.ModelSerializer):
    order_info = OrderSerializer(source='order', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_settle = serializers.BooleanField(read_only=True)
    settlement_blocked_reasons = serializers.ListField(read_only=True)

    class Meta:
        model = Escrow
        fields = '__all__'
        read_only_fields = [
            'order', 'total_amount', 'platform_fee', 'caregiver_amount',
            'refund_amount', 'status', 'paid_at', 'settled_at', 'refunded_at',
            'settlement_notes'
        ]


class RefundRequestSerializer(serializers.ModelSerializer):
    order_info = OrderSerializer(source='order', read_only=True)
    escrow_info = EscrowSerializer(source='escrow', read_only=True)
    initiator_name = serializers.CharField(source='initiator.username', read_only=True)
    handled_by_name = serializers.CharField(source='handled_by.username', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RefundRequest
        fields = '__all__'
        read_only_fields = [
            'order', 'escrow', 'initiator', 'status', 'handled_by',
            'handled_at', 'reject_reason'
        ]

