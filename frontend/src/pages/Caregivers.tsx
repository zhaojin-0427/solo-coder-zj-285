import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Input, Select, Slider, Rate, Tag, Avatar, Button,
  Space, Modal, List, Divider, Empty, Badge, Statistic,
} from 'antd';
import {
  EnvironmentOutlined, StarOutlined, FilterOutlined,
  VideoCameraOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { caregiverApi, reviewApi } from '../api';
import type { CaregiverProfile, Review } from '../types';

const { Option } = Select;

const experienceMap: Record<string, string> = {
  beginner: '1年以下', junior: '1-3年', senior: '3-5年', expert: '5年以上',
};

const Caregivers: React.FC = () => {
  const [allCaregivers, setAllCaregivers] = useState<CaregiverProfile[]>([]);
  const [filtered, setFiltered] = useState<CaregiverProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CaregiverProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [searchKw, setSearchKw] = useState('');
  const [filterDistrict, setFilterDistrict] = useState<string>();
  const [filterExp, setFilterExp] = useState<string>();
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allCaregivers, searchKw, filterDistrict, filterExp, minRating, maxPrice, verifiedOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await caregiverApi.list({ ordering: '-rating' });
      const data = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      setAllCaregivers(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allCaregivers];
    if (searchKw) {
      const kw = searchKw.toLowerCase();
      result = result.filter(cg =>
        (cg.username || '').toLowerCase().includes(kw) ||
        (cg.district || '').toLowerCase().includes(kw)
      );
    }
    if (filterDistrict) {
      result = result.filter(cg => cg.district === filterDistrict);
    }
    if (filterExp) {
      result = result.filter(cg => cg.experience === filterExp);
    }
    if (minRating > 0) {
      result = result.filter(cg => cg.rating >= minRating);
    }
    result = result.filter(cg => cg.price_per_day <= maxPrice);
    if (verifiedOnly) {
      result = result.filter(cg => cg.is_verified);
    }
    setFiltered(result);
  };

  const openDetail = async (cg: CaregiverProfile) => {
    setDetail(cg);
    try {
      const res = await reviewApi.list({ reviewee: cg.user_profile?.user?.id || cg.id, role: 'owner' });
      setReviews(Array.isArray(res.data) ? res.data : (res.data as any).results || []);
    } catch {
      setReviews([]);
    }
  };

  const districts = Array.from(new Set(allCaregivers.map(c => c.district).filter(Boolean)));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">👥 代养人筛选</div>
        <span style={{ color: '#6b7280' }}>共 {filtered.length} 位代养人</span>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Input
              placeholder="搜索代养人姓名或片区"
              prefix={<FilterOutlined />}
              value={searchKw}
              onChange={e => setSearchKw(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="选择片区"
              allowClear
              style={{ width: '100%' }}
              value={filterDistrict}
              onChange={setFilterDistrict}
            >
              {districts.map(d => <Option key={d} value={d}>{d}</Option>)}
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="经验年限"
              allowClear
              style={{ width: '100%' }}
              value={filterExp}
              onChange={setFilterExp}
            >
              <Option value="beginner">1年以下</Option>
              <Option value="junior">1-3年</Option>
              <Option value="senior">3-5年</Option>
              <Option value="expert">5年以上</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="最低评分"
              allowClear
              style={{ width: '100%' }}
              value={minRating || undefined}
              onChange={(v) => setMinRating(v || 0)}
            >
              <Option value={3}>⭐ 3星以上</Option>
              <Option value={4}>⭐ 4星以上</Option>
              <Option value={4.5}>⭐ 4.5星以上</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Button type={verifiedOnly ? 'primary' : 'default'} onClick={() => setVerifiedOnly(!verifiedOnly)} icon={<SafetyCertificateOutlined />}>
              仅看已认证
            </Button>
          </Col>
        </Row>
        <Divider style={{ margin: '16px 0' }} />
        <Row align="middle">
          <Col span={3}>
            <span style={{ color: '#6b7280' }}>最高价格：</span>
          </Col>
          <Col span={18}>
            <Slider
              min={30}
              max={500}
              step={10}
              value={maxPrice}
              onChange={setMaxPrice}
              marks={{ 50: '¥50', 100: '¥100', 200: '¥200', 300: '¥300', 500: '¥500' }}
            />
          </Col>
          <Col span={3} style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: 600, color: '#52c41a' }}>¥{maxPrice}/天</span>
          </Col>
        </Row>
      </Card>

      {filtered.length === 0 ? (
        <Empty description="没有符合条件的代养人，请调整筛选条件" />
      ) : (
        <div className="card-grid">
          {filtered.map((cg) => (
            <Card
              key={cg.id}
              hoverable
              onClick={() => openDetail(cg)}
              style={{ borderRadius: 12 }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                <Badge.Ribbon
                  text={cg.is_verified ? '已认证' : '未认证'}
                  color={cg.is_verified ? 'gold' : 'default'}
                >
                  <Avatar size={60} style={{ backgroundColor: '#52c41a', fontSize: 24 }}>
                    {(cg.username || '用').charAt(0).toUpperCase()}
                  </Avatar>
                </Badge.Ribbon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    {cg.username}
                  </div>
                  <Space style={{ marginBottom: 6 }}>
                    <Rate disabled value={cg.rating} allowHalf style={{ fontSize: 14 }} />
                    <span style={{ fontWeight: 600, color: '#faad14' }}>{cg.rating}</span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>({cg.review_count}条评价)</span>
                  </Space>
                  <Space size={4} wrap>
                    <EnvironmentOutlined style={{ color: '#52c41a' }} />
                    <span style={{ color: '#4b5563', fontSize: 13 }}>{cg.district}</span>
                    <Tag color="blue">{experienceMap[cg.experience]}</Tag>
                  </Space>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}>
                    ¥{cg.price_per_day}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>每天</div>
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>提供服务</div>
                <Space wrap>
                  {cg.service_types?.map(s => <Tag key={s} color="green">{s}</Tag>)}
                </Space>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>可照顾宠物</div>
                <Space wrap>
                  {cg.pet_types?.map(t => (
                    <Tag key={t}>
                      {{ dog: '🐕 狗', cat: '🐱 猫', rabbit: '🐰 兔', bird: '🐦 鸟', other: '🐾 其他' }[t] || t}
                    </Tag>
                  ))}
                </Space>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <Row gutter={8}>
                <Col span={12}>
                  <Statistic title="完成订单" value={cg.completed_orders} valueStyle={{ fontSize: 16 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="日接单数" value={cg.daily_capacity} valueStyle={{ fontSize: 16 }} />
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={
          <Space>
            <Avatar style={{ backgroundColor: '#52c41a' }}>
              {(detail?.username || '用').charAt(0).toUpperCase()}
            </Avatar>
            <span>{detail?.username} 的代养档案</span>
            {detail?.is_verified && <Tag color="gold" icon={<SafetyCertificateOutlined />}>实名认证</Tag>}
          </Space>
        }
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={[
          <Button key="close" onClick={() => setDetail(null)}>关闭</Button>,
          <Button key="hire" type="primary">选择此代养人</Button>,
        ]}
        width={700}
      >
        {detail && (
          <div>
            <Row gutter={24} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="评分" prefix={<StarOutlined />} value={detail.rating} suffix={`/5.0`} />
              </Col>
              <Col span={8}>
                <Statistic title="评价数" value={detail.review_count} />
              </Col>
              <Col span={8}>
                <Statistic title="完成订单" value={detail.completed_orders} />
              </Col>
            </Row>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>📍 所在地区</div>
              <Tag color="blue">{detail.district}</Tag>
              <Tag>{experienceMap[detail.experience]}经验</Tag>
              <Tag color="green">¥{detail.price_per_day}/天</Tag>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>💬 个人简介</div>
              <p style={{ color: '#4b5563' }}>{detail.bio || '这位代养人很神秘，什么都没留下~'}</p>
            </div>

            {detail.video_url && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>
                  <VideoCameraOutlined /> 宠物相处视频
                </div>
                <Card
                  style={{
                    height: 200,
                    background: 'linear-gradient(135deg, #a7f3d0, #6ee7b7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 48,
                    cursor: 'pointer',
                  }}
                >
                  ▶
                </Card>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>🛎️ 提供服务</div>
              <Space wrap>
                {detail.service_types?.map(s => <Tag key={s} color="green">{s}</Tag>)}
              </Space>
            </div>

            <Divider />

            <div>
              <div style={{ fontWeight: 500, marginBottom: 12 }}>⭐ 历史评价 ({reviews.length})</div>
              {reviews.length === 0 ? (
                <Empty description="暂无评价" style={{ padding: 20 }} />
              ) : (
                <List
                  dataSource={reviews.slice(0, 5)}
                  renderItem={(r) => (
                    <List.Item style={{ alignItems: 'flex-start' }}>
                      <List.Item.Meta
                        avatar={<Avatar size={36}>{r.reviewer_name?.charAt(0)}</Avatar>}
                        title={
                          <Space>
                            <span style={{ fontWeight: 500 }}>{r.reviewer_name}</span>
                            <Rate disabled value={r.rating} allowHalf style={{ fontSize: 12 }} />
                          </Space>
                        }
                        description={
                          <div>
                            <p style={{ color: '#4b5563', marginBottom: 4 }}>{r.content}</p>
                            <Space>
                              {r.tags?.map(t => <Tag key={t}>{t}</Tag>)}
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Caregivers;
