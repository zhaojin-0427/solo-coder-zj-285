from django.contrib import admin
from .models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review, OrderChange, Dispute, DisputeMessage,
    Handover
)

admin.site.register(UserProfile)
admin.site.register(CaregiverProfile)
admin.site.register(Pet)
admin.site.register(FosterRequest)
admin.site.register(Order)
admin.site.register(DailyRecord)
admin.site.register(Review)
admin.site.register(OrderChange)
admin.site.register(Dispute)
admin.site.register(DisputeMessage)
admin.site.register(Handover)
