from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'profiles', views.UserProfileViewSet)
router.register(r'caregivers', views.CaregiverProfileViewSet)
router.register(r'pets', views.PetViewSet)
router.register(r'requests', views.FosterRequestViewSet)
router.register(r'orders', views.OrderViewSet)
router.register(r'daily-records', views.DailyRecordViewSet)
router.register(r'reviews', views.ReviewViewSet)
router.register(r'order-changes', views.OrderChangeViewSet)
router.register(r'disputes', views.DisputeViewSet)
router.register(r'handovers', views.HandoverViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('statistics/', views.StatisticsView.as_view(), name='statistics'),
]
