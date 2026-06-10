from django.contrib import admin
from .models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review
)

admin.site.register(UserProfile)
admin.site.register(CaregiverProfile)
admin.site.register(Pet)
admin.site.register(FosterRequest)
admin.site.register(Order)
admin.site.register(DailyRecord)
admin.site.register(Review)
