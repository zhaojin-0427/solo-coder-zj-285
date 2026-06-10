import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Select, DatePicker, InputNumber, Button, Space,
  Row, Col, Tag, Avatar, Rate, List, Modal, message, Progress, Divider,
  Statistic, Steps, App,
} from 'antd';
import {
  SendOutlined, CheckOutlined, StarOutlined,
  EnvironmentOutlined, RobotOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { petApi, requestApi, caregiverApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Pet, CaregiverProfile, FosterRequest } from '../types';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Step } = Steps;

const petIcons: Record<string, string> = {
  dog: '🐕', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾',
};

const serviceOptions = ['遛狗', '陪玩', '拍照', '喂药', '洗澡', '梳毛', '训练', '美容'];

const RequestForm: React.FC = () => {
  const { user, profile } = useAuth();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [pets, setPets] = useState<Pet[]>([]);
  const [matchedCaregivers, setMatchedCaregivers] = useState<CaregiverProfile[]>([]);
  const [matching, setMatching] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverProfile | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<FosterRequest | null>(null);

  useEffect(() => {
    if (user) loadPets();
  }, [user]);

  const loadPets = async () => {
    try {
      const res = await petApi.list({ owner: user?.id });
      const petList = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      setPets(petList);
    } catch {}
  };

  const handleSubmitStep1 = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      const pet = pets.find(p => p.id === values.pet);

      setMatching(true);
      try {
        const res = await caregiverApi.match({
          latitude: profile?.latitude || 39.9042,
          longitude: profile?.longitude || 116.4074,
          pet_type: pet?.pet_type || 'dog',
          services: values.services || [],
          budget: values.budget,
        });
        setMatchedCaregivers(res.data);
        setStep(1);
        message.success(`已为您智能匹配到 ${res.data.length} 位代养人`);
      } finally {
        setMatching(false);
      }
    } catch (e: any) {
      message.error(e?.errorFields ? '请完善表单信息' : e?.message || '匹配失败');
    }
  };

  const handleCreateRequest = async () => {
    try {
      const values = form.getFieldsValue();
      const [start, end] = values.dates;
      const payload: any = {
        owner: user?.id,
        pet: values.pet,
        title: values.title,
        description: values.description,
        services: values.services || [],
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD'),
        district: profile?.district || values.district,
        address: values.address || '',
        latitude: profile?.latitude || 39.9042,
        longitude: profile?.longitude || 116.4074,
        budget: values.budget,
      };
      const res = await requestApi.create(payload);
      setCreatedRequest(res.data);
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleSelectCaregiver = async (cg: CaregiverProfile) => {
    setSelectedCaregiver(cg);
    setConfirmModal(true);
  };

  const handleConfirmMatch = async () => {
    if (!selectedCaregiver) return;
    const req = createdRequest || await handleCreateRequest();
    if (!req) {
      message.error('创建需求失败');
      return;
    }
    try {
      await requestApi.confirmMatch(req.id, selectedCaregiver.id);
      message.success('匹配成功！订单已生成');
      setStep(2);
      setConfirmModal(false);
    } catch (e: any) {
      message.error('匹配失败，请重试');
    }
  };

  const handleJustCreate = async () => {
    try {
      await form.validateFields();
      const req = await handleCreateRequest();
      if (req) {
        message.success('需求已发布，等待代养人接单');
        navigate('/orders');
      } else {
        message.error('发布失败，请稍后重试');
      }
    } catch (e: any) {
      if (e?.errorFields) {
        message.warning('请完善表单必填项');
      } else {
        message.error(e?.message || '发布失败');
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">📋 发布寄养需求</div>
      </div>

      <Steps current={step} style={{ marginBottom: 32, maxWidth: 800 }}>
        <Step title="填写需求" description="填写宠物寄养详细信息" />
        <Step title="智能匹配" description="系统匹配附近代养人" />
        <Step title="确认订单" description="双方确认生成订单" />
      </Steps>

      {step === 0 && (
        <Card style={{ maxWidth: 900, margin: '0 auto' }}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="pet"
              label="选择宠物"
              rules={[{ required: true, message: '请选择要寄养的宠物' }]}
            >
              <Select
                placeholder="请先在宠物档案中添加宠物"
                style={{ width: '100%' }}
                disabled={pets.length === 0}
              >
                {pets.map(pet => (
                  <Option key={pet.id} value={pet.id}>
                    {petIcons[pet.pet_type]} {pet.name} - {pet.breed} ({pet.age}岁)
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="title"
              label="需求标题"
              rules={[{ required: true, message: '请输入需求标题' }]}
            >
              <Input placeholder="如：国庆7天寻爱心代养金毛" maxLength={50} />
            </Form.Item>

            <Form.Item
              name="description"
              label="详细需求说明"
              rules={[{ required: true, message: '请输入详细说明' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请详细描述您的寄养需求，包括特殊要求、宠物日常习惯等..."
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="dates"
                  label="寄养时间"
                  rules={[{ required: true, message: '请选择寄养时间' }]}
                >
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="budget"
                  label="预算（元/天）"
                  rules={[{ required: true, message: '请输入预算' }]}
                >
                  <InputNumber min={20} style={{ width: '100%' }} placeholder="如：150" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="district" label="所在片区" initialValue={profile?.district}>
                  <Input placeholder="如：朝阳区望京" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="address" label="详细地址（选填）">
                  <Input placeholder="方便代养人接送的地址" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="services"
              label="期望服务"
              rules={[{ required: true, message: '请选择期望的服务' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择需要代养人提供的服务"
                style={{ width: '100%' }}
              >
                {serviceOptions.map(s => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            <Space>
              <Button type="primary" size="large" icon={<RobotOutlined />} loading={matching} onClick={handleSubmitStep1}>
                AI 智能匹配代养人
              </Button>
              <Button size="large" onClick={handleJustCreate}>
                仅发布需求，暂不匹配
              </Button>
            </Space>
          </Form>
        </Card>
      )}

      {step === 1 && (
        <div>
          <Card style={{ maxWidth: 900, margin: '0 auto 24px' }}>
            <Space align="center" size={16}>
              <div style={{ fontSize: 40 }}>🎯</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  为您智能匹配了 {matchedCaregivers.length} 位代养人
                </div>
                <div style={{ color: '#6b7280' }}>
                  基于地理位置、服务能力、历史评分综合匹配，点击卡片选择合适的代养人
                </div>
              </div>
            </Space>
          </Card>

          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {matchedCaregivers.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <p>暂时没有匹配到合适的代养人</p>
                  <Space>
                    <Button onClick={() => setStep(0)}>返回修改条件</Button>
                    <Button type="primary" onClick={handleJustCreate}>仅发布需求</Button>
                  </Space>
                </div>
              </Card>
            ) : (
              <List
                dataSource={matchedCaregivers}
                renderItem={(cg) => (
                  <Card
                    key={cg.id}
                    style={{ marginBottom: 16, borderRadius: 12 }}
                    hoverable
                    onClick={() => handleSelectCaregiver(cg)}
                  >
                    <Row gutter={16} align="middle">
                      <Col span={2} style={{ textAlign: 'center' }}>
                        {cg.match_score && cg.match_score >= 90 && (
                          <Tag color="gold" icon={<CrownOutlined />} style={{ fontSize: 14 }}>
                            TOP
                          </Tag>
                        )}
                      </Col>
                      <Col span={4}>
                        <Avatar size={64} style={{ backgroundColor: '#52c41a', fontSize: 24 }}>
                          {(cg.username || '用').charAt(0).toUpperCase()}
                        </Avatar>
                      </Col>
                      <Col span={10}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                          {cg.username}
                          {cg.is_verified && <Tag color="gold" style={{ marginLeft: 8 }}>实名认证</Tag>}
                        </div>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            <EnvironmentOutlined style={{ color: '#52c41a' }} />
                            <span style={{ color: '#4b5563' }}>{cg.district}</span>
                            <Tag color="blue">
                              {{ beginner: '1年以下', junior: '1-3年', senior: '3-5年', expert: '5年以上' }[cg.experience]}
                            </Tag>
                          </Space>
                          <div>
                            {cg.service_types?.slice(0, 5).map(s => (
                              <span className="tag-item" key={s}>{s}</span>
                            ))}
                          </div>
                        </Space>
                      </Col>
                      <Col span={4}>
                        <Space direction="vertical" align="center" style={{ width: '100%' }}>
                          <Space>
                            <Rate disabled value={cg.rating} allowHalf style={{ fontSize: 14 }} />
                            <span style={{ fontWeight: 600, color: '#faad14' }}>{cg.rating}</span>
                          </Space>
                          <span style={{ color: '#6b7280', fontSize: 12 }}>{cg.review_count} 条评价</span>
                          <span style={{ color: '#6b7280', fontSize: 12 }}>完成 {cg.completed_orders} 单</span>
                        </Space>
                      </Col>
                      <Col span={4} style={{ textAlign: 'right' }}>
                        <div style={{ color: '#52c41a', fontSize: 22, fontWeight: 700 }}>
                          ¥{cg.price_per_day}
                          <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280' }}>/天</span>
                        </div>
                        {cg.match_score && (
                          <div style={{ marginTop: 8 }}>
                            <Progress
                              type="dashboard"
                              percent={Math.round(cg.match_score)}
                              size={60}
                              strokeColor="#52c41a"
                            />
                            <div style={{ fontSize: 12, color: '#6b7280' }}>匹配度</div>
                          </div>
                        )}
                      </Col>
                    </Row>
                  </Card>
                )}
              />
            )}
            <Button style={{ marginTop: 16 }} onClick={() => setStep(0)}>
              ← 返回修改需求
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            寄养订单已创建成功！
          </div>
          <div style={{ color: '#6b7280', marginBottom: 24 }}>
            请与代养人保持沟通，按时交接宠物。您可以在「订单跟踪」中查看详情。
          </div>
          <Space>
            <Button type="primary" size="large" onClick={() => navigate('/orders')}>
              查看我的订单
            </Button>
            <Button size="large" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </Space>
        </Card>
      )}

      <Modal
        title="确认匹配此代养人？"
        open={confirmModal}
        onOk={handleConfirmMatch}
        onCancel={() => setConfirmModal(false)}
        okText="确认匹配"
        cancelText="再看看"
        okButtonProps={{ type: 'primary', icon: <CheckOutlined /> }}
      >
        {selectedCaregiver && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <Avatar size={64} style={{ backgroundColor: '#52c41a', fontSize: 24 }}>
                {(selectedCaregiver.username || '用').charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedCaregiver.username}</div>
                <Space>
                  <Rate disabled value={selectedCaregiver.rating} allowHalf style={{ fontSize: 12 }} />
                  <span>{selectedCaregiver.rating} ({selectedCaregiver.review_count}评价)</span>
                </Space>
              </div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="日单价" prefix="¥" value={selectedCaregiver.price_per_day} />
              </Col>
              <Col span={12}>
                <Statistic title="完成订单" value={selectedCaregiver.completed_orders} suffix="单" />
              </Col>
            </Row>
            <div style={{ marginTop: 16, color: '#6b7280' }}>
              <EnvironmentOutlined /> {selectedCaregiver.district}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RequestForm;
