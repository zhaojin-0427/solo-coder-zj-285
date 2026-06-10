import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Progress, Avatar, Space, Button } from 'antd';
import {
  HeartOutlined,
  TeamOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { statsApi, requestApi, orderApi, caregiverApi } from '../api';
import type { Statistics, FosterRequest, Order, CaregiverProfile } from '../types';
import dayjs from 'dayjs';

const petIcons: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
  rabbit: '🐰',
  bird: '🐦',
  other: '🐾',
};

const statusColors: Record<string, string> = {
  open: 'blue',
  matched: 'cyan',
  confirmed: 'green',
  completed: 'gray',
  cancelled: 'red',
  pending: 'orange',
  active: 'green',
  disputed: 'red',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [requests, setRequests] = useState<FosterRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, r, o, c] = await Promise.all([
        statsApi.get(),
        requestApi.list({ page_size: 5 }),
        orderApi.list({ page_size: 5 }),
        caregiverApi.list({ ordering: '-rating', page_size: 5 }),
      ]);
      setStats(s.data);
      setRequests(Array.isArray(r.data) ? r.data : (r.data as any).results || []);
      setOrders(Array.isArray(o.data) ? o.data : (o.data as any).results || []);
      setCaregivers(Array.isArray(c.data) ? c.data : (c.data as any).results || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">首页概览</div>
        <Space>
          <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate('/requests/new')}>
            发布寄养需求
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>注册用户</span>}
              value={stats?.overview.total_users || 0}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>注册宠物</span>}
              value={stats?.overview.total_pets || 0}
              prefix={<HeartOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>订单总数</span>}
              value={stats?.overview.total_orders || 0}
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
            <Progress
              percent={stats?.overview.completion_rate || 0}
              size="small"
              showInfo
              style={{ marginTop: 8 }}
              strokeColor="#52c41a"
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              完成率 {stats?.overview.completion_rate || 0}%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>认证代养人</span>}
              value={stats?.overview.total_caregivers || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="最新寄养需求"
            extra={<Button type="link" onClick={() => navigate('/caregivers')}>查看代养人 <ArrowRightOutlined /></Button>}
          >
            <List
              dataSource={requests}
              renderItem={(req) => (
                <List.Item
                  actions={[<Tag color={statusColors[req.status]} key="status">{
                    { open: '寻找中', matched: '已匹配', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[req.status]
                  }</Tag>]}
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 32 }}>{petIcons[req.pet_info?.pet_type] || '🐾'}</div>}
                    title={
                      <Space>
                        <span style={{ fontWeight: 500 }}>{req.title}</span>
                        <Tag color="orange">¥{req.budget}/天</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <span>🐾 {req.pet_info?.name} · {req.pet_info?.breed}</span>
                        <span>📅 {dayjs(req.start_date).format('MM-DD')} ~ {dayjs(req.end_date).format('MM-DD')} · {req.district}</span>
                        <Space size={4}>
                          {req.services?.map(s => <span className="tag-item" key={s}>{s}</span>)}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="高评分代养人"
            extra={<Button type="link" onClick={() => navigate('/caregivers')}>查看全部 <ArrowRightOutlined /></Button>}
          >
            <List
              dataSource={caregivers.slice(0, 5)}
              renderItem={(cg) => (
                <List.Item
                  actions={[
                    <Space key="info">
                      <Tag color="green">⭐ {cg.rating}</Tag>
                      <Tag color="blue">¥{cg.price_per_day}/天</Tag>
                    </Space>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar size={48} style={{ backgroundColor: '#52c41a' }}>
                        {(cg.username || '用').charAt(0).toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <span style={{ fontWeight: 500 }}>{cg.username}</span>
                        {cg.is_verified && <Tag color="gold">已认证</Tag>}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <span>📍 {cg.district} · {
                          { beginner: '1年以下', junior: '1-3年', senior: '3-5年', expert: '5年以上' }[cg.experience]
                        }经验</span>
                        <Space size={4}>
                          {cg.service_types?.slice(0, 4).map(s => <span className="tag-item" key={s}>{s}</span>)}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title="我的订单动态"
            extra={<Button type="link" onClick={() => navigate('/orders')}>全部订单 <ArrowRightOutlined /></Button>}
          >
            <List
              dataSource={orders}
              renderItem={(order) => (
                <List.Item
                  actions={[<Tag color={statusColors[order.status]} key="status">{
                    { pending: '待确认', active: '进行中', completed: '已完成', cancelled: '已取消', disputed: '有争议' }[order.status]
                  }</Tag>]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span style={{ fontWeight: 500 }}>订单 #{order.id}</span>
                        <Tag color="orange">¥{order.total_price}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <span>🐾 {order.foster_request_info?.pet_info?.name} · 主人: {order.owner_name} · 代养人: {order.caregiver_name}</span>
                        <span>📅 {dayjs(order.start_date).format('YYYY-MM-DD')} ~ {dayjs(order.end_date).format('YYYY-MM-DD')}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
