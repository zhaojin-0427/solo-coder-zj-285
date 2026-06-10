from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('owner', '宠物主人'),
        ('caregiver', '代养人'),
        ('both', '双重身份'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    district = models.CharField(max_length=100, help_text='所在片区，如：朝阳区望京')
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(default=39.9042, help_text='纬度')
    longitude = models.FloatField(default=116.4074, help_text='经度')
    bio = models.TextField(blank=True, help_text='个人简介')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.get_role_display()}'


class CaregiverProfile(models.Model):
    EXPERIENCE_CHOICES = [
        ('beginner', '1年以下'),
        ('junior', '1-3年'),
        ('senior', '3-5年'),
        ('expert', '5年以上'),
    ]

    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='caregiver')
    experience = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, default='beginner')
    service_types = models.JSONField(default=list, help_text='可提供服务：遛狗、陪玩、拍照、喂药等')
    pet_types = models.JSONField(default=list, help_text='可照顾宠物类型：狗、猫、兔子等')
    video_url = models.URLField(blank=True, help_text='宠物相处视频')
    daily_capacity = models.IntegerField(default=2, help_text='每日可照顾宠物数量')
    price_per_day = models.DecimalField(max_digits=8, decimal_places=2, default=100.00)
    rating = models.FloatField(default=0.0, help_text='平均评分')
    review_count = models.IntegerField(default=0, help_text='评价数量')
    completed_orders = models.IntegerField(default=0, help_text='完成订单数')
    is_verified = models.BooleanField(default=False, help_text='是否实名认证')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user_profile.user.username} 的代养档案'


class Pet(models.Model):
    TYPE_CHOICES = [
        ('dog', '狗'),
        ('cat', '猫'),
        ('rabbit', '兔子'),
        ('bird', '鸟'),
        ('other', '其他'),
    ]

    GENDER_CHOICES = [
        ('male', '公'),
        ('female', '母'),
        ('unknown', '未知'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pets')
    name = models.CharField(max_length=50)
    pet_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    breed = models.CharField(max_length=100, help_text='品种')
    age = models.FloatField(help_text='年龄（岁）')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    weight = models.FloatField(help_text='体重（kg）', blank=True, null=True)
    personality = models.TextField(help_text='性格特点，如：温顺、活泼、胆小等')
    diet_restrictions = models.TextField(blank=True, help_text='饮食禁忌')
    health_notes = models.TextField(blank=True, help_text='健康状况说明')
    avatar = models.ImageField(upload_to='pets/', blank=True, null=True)
    is_vaccinated = models.BooleanField(default=False, help_text='是否已接种疫苗')
    is_neutered = models.BooleanField(default=False, help_text='是否已绝育')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.get_pet_type_display()})'


class FosterRequest(models.Model):
    STATUS_CHOICES = [
        ('open', '寻找代养中'),
        ('matched', '已匹配代养人'),
        ('confirmed', '已确认订单'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='foster_requests')
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='foster_requests')
    title = models.CharField(max_length=200)
    description = models.TextField(help_text='详细需求说明')
    services = models.JSONField(default=list, help_text='期望服务：遛狗、陪玩、拍照、喂药等')
    start_date = models.DateField()
    end_date = models.DateField()
    district = models.CharField(max_length=100, help_text='所在片区')
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(default=39.9042)
    longitude = models.FloatField(default=116.4074)
    budget = models.DecimalField(max_digits=10, decimal_places=2, help_text='预算（元/天）')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    matched_caregiver = models.ForeignKey(
        CaregiverProfile, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='matched_requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} - {self.pet.name}'


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', '待确认'),
        ('active', '进行中'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
        ('disputed', '有争议'),
    ]

    foster_request = models.OneToOneField(
        FosterRequest, on_delete=models.CASCADE, related_name='order'
    )
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders_as_owner')
    caregiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders_as_caregiver')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_date = models.DateField()
    end_date = models.DateField()
    owner_reviewed = models.BooleanField(default=False)
    caregiver_reviewed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'订单 #{self.id} - {self.foster_request.pet.name}'


class DailyRecord(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='daily_records')
    caregiver = models.ForeignKey(User, on_delete=models.CASCADE)
    record_date = models.DateField()
    feeding_info = models.TextField(help_text='喂养情况')
    pet_status = models.TextField(help_text='宠物状态')
    mood = models.CharField(max_length=50, blank=True, help_text='宠物心情')
    abnormal_behavior = models.BooleanField(default=False, help_text='是否有异常行为')
    abnormal_description = models.TextField(blank=True, help_text='异常行为描述')
    photos = models.JSONField(default=list, help_text='状态照片URL列表')
    notes = models.TextField(blank=True, help_text='备注')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['order', 'record_date']

    def __str__(self):
        return f'{self.order.id} - {self.record_date}'


class Review(models.Model):
    ROLE_CHOICES = [
        ('owner', '主人评价'),
        ('caregiver', '代养人评价'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    rating = models.IntegerField(help_text='评分 1-5')
    content = models.TextField(help_text='评价内容')
    tags = models.JSONField(default=list, help_text='评价标签')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.reviewer.username} 评价 {self.reviewee.username} ({self.rating}星)'
