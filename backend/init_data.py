import os
import sys
import django
from datetime import date, timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petfoster.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import (
    UserProfile, CaregiverProfile, Pet, FosterRequest,
    Order, DailyRecord, Review
)


def init_data():
    print('开始初始化数据...')

    districts = [
        '朝阳区望京', '朝阳区国贸', '海淀区中关村', '海淀区五道口',
        '西城区金融街', '东城区王府井', '丰台区方庄', '通州区梨园',
    ]

    users_data = [
        {'username': 'zhang_san', 'role': 'owner', 'district': '朝阳区望京', 'lat': 39.9952, 'lon': 116.4716},
        {'username': 'li_si', 'role': 'owner', 'district': '海淀区中关村', 'lat': 39.9836, 'lon': 116.3164},
        {'username': 'wang_wu', 'role': 'caregiver', 'district': '朝阳区望京', 'lat': 39.9920, 'lon': 116.4690},
        {'username': 'zhao_liu', 'role': 'caregiver', 'district': '海淀区五道口', 'lat': 39.9929, 'lon': 116.3385},
        {'username': 'qian_qi', 'role': 'caregiver', 'district': '朝阳区国贸', 'lat': 39.9087, 'lon': 116.4605},
        {'username': 'sun_ba', 'role': 'both', 'district': '西城区金融街', 'lat': 39.9132, 'lon': 116.3651},
        {'username': 'zhou_jiu', 'role': 'caregiver', 'district': '丰台区方庄', 'lat': 39.8648, 'lon': 116.4341},
        {'username': 'wu_shi', 'role': 'owner', 'district': '通州区梨园', 'lat': 39.8932, 'lon': 116.6646},
    ]

    users = []
    for ud in users_data:
        user, created = User.objects.get_or_create(
            username=ud['username'],
            defaults={'email': f'{ud["username"]}@example.com', 'first_name': ud['username']}
        )
        if created:
            user.set_password('123456')
            user.save()
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': ud['role'],
                'phone': f'138{random.randint(10000000, 99999999)}',
                'district': ud['district'],
                'latitude': ud['lat'],
                'longitude': ud['lon'],
                'bio': f'我是{ud["username"]}，热爱宠物！'
            }
        )
        users.append(user)
        print(f'用户: {user.username}, 角色: {profile.get_role_display()}, 片区: {profile.district}')

        if ud['role'] in ['caregiver', 'both']:
            exp_choices = ['beginner', 'junior', 'senior', 'expert']
            services = ['遛狗', '陪玩', '拍照', '喂药', '洗澡', '梳毛']
            pet_types = ['dog', 'cat', 'rabbit']
            cg, _ = CaregiverProfile.objects.get_or_create(
                user_profile=profile,
                defaults={
                    'experience': random.choice(exp_choices),
                    'service_types': random.sample(services, random.randint(2, 5)),
                    'pet_types': random.sample(pet_types, random.randint(1, 3)),
                    'video_url': 'https://example.com/pet-video.mp4',
                    'daily_capacity': random.randint(1, 4),
                    'price_per_day': random.choice([80, 100, 120, 150, 200]),
                    'rating': round(random.uniform(3.5, 5.0), 1),
                    'review_count': random.randint(0, 30),
                    'completed_orders': random.randint(0, 50),
                    'is_verified': random.choice([True, True, True, False])
                }
            )
            print(f'  → 代养人资料: 评分{cg.rating}, 日单价¥{cg.price_per_day}')

    pets_data = [
        {'owner': 'zhang_san', 'name': '旺财', 'type': 'dog', 'breed': '金毛', 'age': 3, 'gender': 'male', 'weight': 25,
         'personality': '温顺友好，喜欢和人亲近，爱玩耍', 'diet': '不能吃葡萄和巧克力，每天两顿狗粮'},
        {'owner': 'zhang_san', 'name': '咪咪', 'type': 'cat', 'breed': '英短', 'age': 2, 'gender': 'female', 'weight': 4.5,
         'personality': '独立安静，陌生人面前胆小，熟悉后很粘人', 'diet': '主要吃猫粮，不能吃咸的'},
        {'owner': 'li_si', 'name': '豆豆', 'type': 'dog', 'breed': '泰迪', 'age': 1.5, 'gender': 'male', 'weight': 5,
         'personality': '活泼好动，好奇心强，见到陌生人会叫', 'diet': '少食多餐，对某些肉类过敏'},
        {'owner': 'li_si', 'name': '小白', 'type': 'rabbit', 'breed': '垂耳兔', 'age': 1, 'gender': 'female', 'weight': 2,
         'personality': '胆小温顺，喜欢被轻轻抚摸', 'diet': '提摩西草为主，少量兔粮'},
        {'owner': 'sun_ba', 'name': '大黄', 'type': 'dog', 'breed': '拉布拉多', 'age': 4, 'gender': 'male', 'weight': 30,
         'personality': '超级温顺，对小孩特别友好，会各种指令', 'diet': '每天两顿，食量较大'},
        {'owner': 'wu_shi', 'name': '花花', 'type': 'cat', 'breed': '布偶', 'age': 3, 'gender': 'female', 'weight': 5,
         'personality': '非常粘人，喜欢被抱，性格像小狗', 'diet': '高端猫粮为主，偶尔罐头'},
    ]

    pets = []
    for pd in pets_data:
        owner_user = User.objects.get(username=pd['owner'])
        pet, _ = Pet.objects.get_or_create(
            owner=owner_user,
            name=pd['name'],
            defaults={
                'pet_type': pd['type'],
                'breed': pd['breed'],
                'age': pd['age'],
                'gender': pd['gender'],
                'weight': pd['weight'],
                'personality': pd['personality'],
                'diet_restrictions': pd['diet'],
                'health_notes': '健康状况良好，已驱虫',
                'is_vaccinated': True,
                'is_neutered': random.choice([True, False])
            }
        )
        pets.append(pet)
        print(f'宠物: {pet.name} ({pet.get_pet_type_display()}), 品种: {pet.breed}, 主人: {owner_user.username}')

    services_list = ['遛狗', '陪玩', '拍照', '喂药', '洗澡']
    requests_data = [
        {'owner': 'zhang_san', 'pet_idx': 0, 'title': '国庆7天寻爱心代养金毛', 'desc': '国庆出游，希望找一位有经验的代养人照顾我家旺财，需要每天遛狗两次。',
         'services': ['遛狗', '陪玩', '拍照'], 'days': 7, 'budget': 150},
        {'owner': 'zhang_san', 'pet_idx': 1, 'title': '出差3天照顾英短', 'desc': '短期出差，需要有人每天上门喂猫、铲屎，陪玩半小时。',
         'services': ['陪玩', '喂药'], 'days': 3, 'budget': 100},
        {'owner': 'li_si', 'pet_idx': 2, 'title': '周末两天代养泰迪', 'desc': '周末有事外出，家里没人照顾豆豆，希望能找个近的代养。',
         'services': ['遛狗', '陪玩'], 'days': 2, 'budget': 120},
        {'owner': 'li_si', 'pet_idx': 3, 'title': '5天代养垂耳兔', 'desc': '回老家几天，需要有人帮忙照顾小白，每天喂食换水。',
         'services': ['陪玩', '拍照'], 'days': 5, 'budget': 80},
        {'owner': 'wu_shi', 'pet_idx': 5, 'title': '中秋假期代养布偶猫', 'desc': '中秋回家，希望有养猫经验的代养人照顾花花。',
         'services': ['陪玩', '拍照'], 'days': 4, 'budget': 130},
    ]

    foster_requests = []
    for rd in requests_data:
        owner_user = User.objects.get(username=rd['owner'])
        profile = owner_user.profile
        pet = pets[rd['pet_idx']]
        start = date.today() + timedelta(days=random.randint(1, 10))
        end = start + timedelta(days=rd['days'] - 1)

        fr, created = FosterRequest.objects.get_or_create(
            owner=owner_user,
            pet=pet,
            title=rd['title'],
            defaults={
                'description': rd['desc'],
                'services': rd['services'],
                'start_date': start,
                'end_date': end,
                'district': profile.district,
                'address': profile.address or f'{profile.district}XX小区',
                'latitude': profile.latitude,
                'longitude': profile.longitude,
                'budget': rd['budget'],
                'status': random.choice(['open', 'open', 'matched', 'confirmed', 'completed']),
            }
        )
        if created:
            foster_requests.append(fr)
            print(f'需求: {fr.title}, 状态: {fr.get_status_display()}, 预算: ¥{fr.budget}/天')

            if fr.status in ['matched', 'confirmed', 'completed']:
                cg_profiles = list(CaregiverProfile.objects.filter(
                    is_verified=True,
                    price_per_day__lte=fr.budget
                ).exclude(user_profile__user=owner_user))
                if cg_profiles:
                    fr.matched_caregiver = random.choice(cg_profiles)
                    fr.save()

                    if fr.status in ['confirmed', 'completed']:
                        total = rd['days'] * float(fr.matched_caregiver.price_per_day)
                        order, _ = Order.objects.get_or_create(
                            foster_request=fr,
                            defaults={
                                'owner': fr.owner,
                                'caregiver': fr.matched_caregiver.user_profile.user,
                                'total_price': total,
                                'status': fr.status,
                                'start_date': start,
                                'end_date': end,
                                'owner_reviewed': fr.status == 'completed',
                                'caregiver_reviewed': fr.status == 'completed',
                            }
                        )
                        print(f'  → 订单 #{order.id}, 总价: ¥{total}, 状态: {order.get_status_display()}')

                        if order.status == 'completed':
                            for i in range(rd['days']):
                                r_date = start + timedelta(days=i)
                                moods = ['活泼', '正常', '安静', '开心', '懒散']
                                DailyRecord.objects.get_or_create(
                                    order=order,
                                    record_date=r_date,
                                    defaults={
                                        'caregiver': order.caregiver,
                                        'feeding_info': '按时喂食，食欲良好',
                                        'pet_status': '状态良好，活动正常',
                                        'mood': random.choice(moods),
                                        'abnormal_behavior': random.random() < 0.1,
                                        'abnormal_description': '' if random.random() >= 0.1 else '今天食欲稍差',
                                        'photos': [f'/media/samples/pet_{random.randint(1, 5)}.jpg'],
                                        'notes': ''
                                    }
                                )

                            review_contents_owner = [
                                '代养人非常负责任，每天都有发照片和视频，狗狗很开心！',
                                '非常专业的代养服务，照顾得很好，下次还会选择！',
                                '人很nice，沟通顺畅，宠物适应得很快。',
                            ]
                            review_contents_cg = [
                                '主人很nice，狗狗也很乖，期待下次合作！',
                                '宠物照顾得很好，沟通很愉快。',
                                '主人信息提供很详细，照顾起来很顺利。',
                            ]
                            tags_list = [['负责', '准时'], ['有爱心', '专业'], ['沟通好']]

                            Review.objects.get_or_create(
                                order=order,
                                reviewer=fr.owner,
                                role='owner',
                                defaults={
                                    'reviewee': order.caregiver,
                                    'rating': random.randint(4, 5),
                                    'content': random.choice(review_contents_owner),
                                    'tags': random.choice(tags_list)
                                }
                            )
                            Review.objects.get_or_create(
                                order=order,
                                reviewer=order.caregiver,
                                role='caregiver',
                                defaults={
                                    'reviewee': fr.owner,
                                    'rating': random.randint(4, 5),
                                    'content': random.choice(review_contents_cg),
                                    'tags': random.choice(tags_list)
                                }
                            )

    print('\n数据初始化完成！')
    print(f'用户总数: {User.objects.count()}')
    print(f'代养人总数: {CaregiverProfile.objects.count()}')
    print(f'宠物总数: {Pet.objects.count()}')
    print(f'寄养需求总数: {FosterRequest.objects.count()}')
    print(f'订单总数: {Order.objects.count()}')
    print(f'每日记录总数: {DailyRecord.objects.count()}')
    print(f'评价总数: {Review.objects.count()}')
    print('\n默认密码: 123456')


if __name__ == '__main__':
    init_data()
