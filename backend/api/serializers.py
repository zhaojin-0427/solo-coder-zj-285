from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review
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

    class Meta:
        model = Order
        fields = '__all__'


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
