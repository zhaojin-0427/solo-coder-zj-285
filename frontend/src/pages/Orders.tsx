import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Tag, List, Avatar, Button, Space, Modal, Form, Input,
  Rate, Select, DatePicker, Upload, Switch, Row, Col, Empty, message,
  Descriptions, Divider, Image, App, Timeline, Steps, Progress,
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, StarOutlined,
  CameraOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { orderApi, dailyRecordApi, reviewApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Order, DailyRecord, Review } from '../types';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待确认' },
  active: { color: 'green', label: '进行中' },
  completed: { color: 'gray', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
  disputed: { color: 'red', label: '有争议' },
};

const moodOptions = ['活泼', '正常', '安静', '开心', '懒散', '焦虑'];

const Orders: React.FC = () => {
  const { user } = useAuth();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [recordModal, setRecordModal] = useState(false);
  const [recordForm] = Form.useForm();
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const [detailModal, setDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [orderReviews, setOrderReviews] = useState<Review[]>([]);

  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reviewRole, setReviewRole] = useState<'owner' | 'caregiver'>('owner');

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const res = await orderApi.list(params);
      const allOrders = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      const myOrders = allOrders.filter(
        (o: Order) => o.owner === user?.id || o.caregiver === user?.id
      );
      setOrders(myOrders);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (order: Order) => {
    setDetailOrder(order);
    setDetailModal(true);
    try {
      const [r, rv] = await Promise.all([
        dailyRecordApi.list({ order: order.id }),
        reviewApi.list({ order: order.id }),
      ]);
      setDailyRecords(Array.isArray(r.data) ? r.data : (r.data as any).results || []);
      setOrderReviews(Array.isArray(rv.data) ? rv.data : (rv.data as any).results || []);
    } catch {}
  };

  const openRecord = (order: Order) => {
    setCurrentOrder(order);
    recordForm.resetFields();
    recordForm.setFieldsValue({
      record_date: dayjs(),
      abnormal_behavior: false,
    });
    setRecordModal(true);
  };

  const submitRecord = async () => {
    try {
      const values = await recordForm.validateFields();
      await dailyRecordApi.create({
        ...values,
        record_date: values.record_date.format('YYYY-MM-DD'),
        order: currentOrder?.id,
        caregiver: user?.id,
        photos: [],
      });
      message.success('每日记录提交成功');
      setRecordModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e: any) {
      message.error('提交失败');
    }
  };

  const handleStart = async (order: Order) => {
    await orderApi.start(order.id);
    message.success('订单已开始');
    loadOrders();
  };

  const handleComplete = async (order: Order) => {
    modal.confirm({
      title: '确认完成此订单？',
      content: '订单完成后双方将可以进行评价。',
      onOk: async () => {
        await orderApi.complete(order.id);
        message.success('订单已完成');
        loadOrders();
      },
    });
  };

  const openReview = (order: Order, role: 'owner' | 'caregiver') => {
    setCurrentOrder(order);
    setReviewRole(role);
    reviewForm.resetFields();
    reviewForm.setFieldsValue({ rating: 5 });
    setReviewModal(true);
  };

  const submitReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      const isOwner = reviewRole === 'owner';
      await reviewApi.create({
        ...values,
        order: currentOrder?.id,
        reviewer: user?.id,
        reviewee: isOwner ? currentOrder?.caregiver : currentOrder?.owner,
        role: reviewRole,
        tags: values.tags || [],
      });
      message.success('评价提交成功');
      setReviewModal(false);
      if (detailOrder?.id === currentOrder?.id) {
        openDetail(currentOrder!);
      }
      loadOrders();
    } catch (e) {
      message.error('提交失败');
    }
  };

  const getOrderStep = (order: Order) => {
    switch (order.status) {
      case 'pending': return 0;
      case 'active': return 1;
      case 'completed': return 2;
      default: return 0;
    }
  };

  const totalDays = (order: Order) => {
    return dayjs(order.end_date).diff(dayjs(order.start_date), 'day') + 1;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">📦 订单跟踪</div>
        <Button type="primary" onClick={() => navigate('/requests/new')}>
          + 发布寄养需求
        </Button>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部订单" key="all" />
          <TabPane tab="待确认" key="pending" />
          <TabPane tab="进行中" key="active" />
          <TabPane tab="已完成" key="completed" />
        </Tabs>
      </Card>

      {orders.length === 0 ? (
        <Empty description="暂无订单，快去发布寄养需求吧~" />
      ) : (
        <List
          loading={loading}
          dataSource={orders}
          renderItem={(order) => {
            const st = statusMap[order.status];
            const isOwner = order.owner === user?.id;
            const days = totalDays(order);
            const progress = Math.min(100, Math.round(dailyRecords.filter(r => r.order === order.id).length / days * 100));
            return (
              <Card
                style={{ marginBottom: 16, borderRadius: 12 }}
                bodyStyle={{ padding: 20 }}
              >
                <Row gutter={16} align="middle">
                  <Col xs={24} md={8}>
                    <Space style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>订单 #{order.id}</span>
                      <Tag color={st.color} style={{ fontSize: 13 }}>{st.label}</Tag>
                    </Space>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                        🐾 宠物：{order.foster_request_info?.pet_info?.name} ({order.foster_request_info?.pet_info?.breed})
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                        {isOwner ? '🏠 代养人：' : '👤 宠物主人：'}
                        {isOwner ? order.caregiver_name : order.owner_name}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        📅 {dayjs(order.start_date).format('MM-DD')} ~ {dayjs(order.end_date).format('MM-DD')} （{days}天）
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={10}>
                    <Steps
                      size="small"
                      current={getOrderStep(order)}
                      style={{ marginBottom: 12 }}
                    >
                      <Step title="已确认" />
                      <Step title="服务中" />
                      <Step title="已完成" />
                    </Steps>
                    {order.status === 'active' && (
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          服务进度：已记录 {dailyRecords.filter(r => r.order === order.id).length}/{days} 天
                        </div>
                        <Progress percent={progress} size="small" strokeColor="#52c41a" />
                      </div>
                    )}
                    {order.status === 'completed' && (
                      <Space wrap>
                        <Tag color={order.owner_reviewed ? 'green' : 'default'}>
                          {order.owner_reviewed ? '✓ 主人已评价' : '主人待评价'}
                        </Tag>
                        <Tag color={order.caregiver_reviewed ? 'green' : 'default'}>
                          {order.caregiver_reviewed ? '✓ 代养人已评价' : '代养人待评价'}
                        </Tag>
                      </Space>
                    )}
                  </Col>
                  <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                    <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
                      ¥{order.total_price}
                    </div>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Button type="primary" block onClick={() => openDetail(order)}>
                        查看详情
                      </Button>
                      {order.status === 'pending' && (
                        <Button block onClick={() => handleStart(order)}>
                          开始服务
                        </Button>
                      )}
                      {order.status === 'active' && !isOwner && (
                        <Button block icon={<PlusOutlined />} onClick={() => openRecord(order)}>
                          登记今日情况
                        </Button>
                      )}
                      {order.status === 'active' && (
                        <Button block type="default" onClick={() => handleComplete(order)}>
                          完成订单
                        </Button>
                      )}
                      {order.status === 'completed' && isOwner && !order.owner_reviewed && (
                        <Button block type="primary" icon={<StarOutlined />} onClick={() => openReview(order, 'owner')}>
                          评价代养人
                        </Button>
                      )}
                      {order.status === 'completed' && !isOwner && !order.caregiver_reviewed && (
                        <Button block type="primary" icon={<StarOutlined />} onClick={() => openReview(order, 'caregiver')}>
                          评价主人
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          }}
        />
      )}

      <Modal
        title="📝 登记今日喂养情况"
        open={recordModal}
        onOk={submitRecord}
        onCancel={() => setRecordModal(false)}
        okText="提交记录"
        cancelText="取消"
        width={600}
      >
        <Form form={recordForm} layout="vertical">
          <Form.Item name="record_date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isAfter(dayjs())} />
          </Form.Item>
          <Form.Item name="feeding_info" label="喂养情况" rules={[{ required: true, message: '请填写喂养情况' }]}>
            <TextArea rows={2} placeholder="喂食时间、食物种类、食欲情况等" />
          </Form.Item>
          <Form.Item name="pet_status" label="宠物状态" rules={[{ required: true, message: '请填写宠物状态' }]}>
            <TextArea rows={2} placeholder="精神状态、活动情况、健康状况等" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mood" label="宠物心情">
                <Select placeholder="选择心情">
                  {moodOptions.map(m => <Option key={m} value={m}>{m}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="abnormal_behavior" label="异常行为" valuePropName="checked">
                <Switch checkedChildren="有" unCheckedChildren="无" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate={(p, c) => p.abnormal_behavior !== c.abnormal_behavior}>
            {({ getFieldValue }) =>
              getFieldValue('abnormal_behavior') ? (
                <Form.Item name="abnormal_description" label="异常行为描述" rules={[{ required: true }]}>
                  <TextArea rows={2} placeholder="请描述具体异常情况" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item label="状态照片">
            <Upload
              listType="picture-card"
              multiple
              beforeUpload={() => false}
            >
              <div>
                <CameraOutlined />
                <div style={{ marginTop: 8 }}>上传照片</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="其他需要说明的情况" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={reviewRole === 'owner' ? '⭐ 评价代养人' : '⭐ 评价宠物主人'}
        open={reviewModal}
        onOk={submitReview}
        onCancel={() => setReviewModal(false)}
        okText="提交评价"
        cancelText="取消"
        width={520}
      >
        <Form form={reviewForm} layout="vertical">
          <Form.Item
            name="rating"
            label="综合评分"
            rules={[{ required: true, message: '请评分' }]}
          >
            <Rate style={{ fontSize: 32 }} />
          </Form.Item>
          <Form.Item
            name="content"
            label="评价内容"
            rules={[{ required: true, message: '请填写评价内容' }]}
          >
            <TextArea rows={4} placeholder="分享您的真实体验，帮助其他用户做出选择..." />
          </Form.Item>
          <Form.Item name="tags" label="评价标签">
            <Select
              mode="tags"
              placeholder="选择或添加标签"
              style={{ width: '100%' }}
              options={[
                { value: '负责', label: '负责' },
                { value: '有爱心', label: '有爱心' },
                { value: '准时', label: '准时' },
                { value: '专业', label: '专业' },
                { value: '沟通好', label: '沟通好' },
                { value: '干净', label: '干净' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`订单 #${detailOrder?.id} 详情`}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[<Button key="close" onClick={() => setDetailModal(false)}>关闭</Button>]}
        width={800}
      >
        {detailOrder && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="订单状态">
                <Tag color={statusMap[detailOrder.status].color}>
                  {statusMap[detailOrder.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{detailOrder.total_price}</span>
              </Descriptions.Item>
              <Descriptions.Item label="宠物主人">{detailOrder.owner_name}</Descriptions.Item>
              <Descriptions.Item label="代养人">{detailOrder.caregiver_name}</Descriptions.Item>
              <Descriptions.Item label="开始日期">{detailOrder.start_date}</Descriptions.Item>
              <Descriptions.Item label="结束日期">{detailOrder.end_date}</Descriptions.Item>
              <Descriptions.Item label="宠物信息" span={2}>
                {detailOrder.foster_request_info?.pet_info?.name} -
                {detailOrder.foster_request_info?.pet_info?.breed}
              </Descriptions.Item>
              <Descriptions.Item label="需求描述" span={2}>
                {detailOrder.foster_request_info?.description}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">📋 每日服务记录</Divider>
            {dailyRecords.length === 0 ? (
              <Empty description="暂无服务记录" />
            ) : (
              <Timeline
                items={dailyRecords.sort((a, b) => dayjs(b.record_date).unix() - dayjs(a.record_date).unix()).map(r => ({
                  color: r.abnormal_behavior ? 'red' : 'green',
                  dot: r.abnormal_behavior ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />,
                  children: (
                    <div style={{ marginBottom: 12 }}>
                      <Space style={{ marginBottom: 8 }}>
                        <strong>{r.record_date}</strong>
                        {r.mood && <Tag>{r.mood}</Tag>}
                        {r.abnormal_behavior && <Tag color="red">有异常</Tag>}
                      </Space>
                      <div style={{ color: '#4b5563', fontSize: 13 }}>
                        <p style={{ marginBottom: 4 }}>🍚 <strong>喂养：</strong>{r.feeding_info}</p>
                        <p style={{ marginBottom: 4 }}>🐾 <strong>状态：</strong>{r.pet_status}</p>
                        {r.abnormal_behavior && (
                          <p style={{ color: '#ef4444', marginBottom: 4 }}>
                            ⚠️ <strong>异常：</strong>{r.abnormal_description}
                          </p>
                        )}
                        {r.notes && <p>📝 <strong>备注：</strong>{r.notes}</p>}
                      </div>
                    </div>
                  ),
                }))}
              />
            )}

            <Divider orientation="left">⭐ 双方评价</Divider>
            {orderReviews.length === 0 ? (
              <Empty description="暂无评价" />
            ) : (
              <List
                dataSource={orderReviews}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar size={40}>{r.reviewer_name?.charAt(0)}</Avatar>}
                      title={
                        <Space>
                          <span style={{ fontWeight: 500 }}>
                            {r.reviewer_name}
                            <Tag color={r.role === 'owner' ? 'blue' : 'green'} style={{ marginLeft: 6 }}>
                              {r.role === 'owner' ? '主人评价' : '代养人评价'}
                            </Tag>
                          </span>
                          <Rate disabled value={r.rating} allowHalf style={{ fontSize: 14 }} />
                        </Space>
                      }
                      description={
                        <div>
                          <p style={{ color: '#4b5563' }}>{r.content}</p>
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
        )}
      </Modal>
    </div>
  );
};

export default Orders;
