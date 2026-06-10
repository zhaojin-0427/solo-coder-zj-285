import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Modal, Form, Input, Select, InputNumber,
  Switch, Space, Tag, Descriptions, Avatar, App, Empty, message
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { petApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Pet } from '../types';

const petIcons: Record<string, string> = {
  dog: '🐕', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾',
};

const Pets: React.FC = () => {
  const { user } = useAuth();
  const { modal } = App.useApp();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPet, setDetailPet] = useState<Pet | null>(null);

  useEffect(() => {
    if (user) loadPets();
  }, [user]);

  const loadPets = async () => {
    setLoading(true);
    try {
      const res = await petApi.list({ owner: user?.id });
      setPets(Array.isArray(res.data) ? res.data : (res.data as any).results || []);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (pet: Pet) => {
    setEditing(pet);
    form.setFieldsValue({
      ...pet,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await petApi.update(editing.id, { ...values, owner: user?.id });
        message.success('宠物信息更新成功');
      } else {
        await petApi.create({ ...values, owner: user?.id });
        message.success('宠物添加成功');
      }
      setModalOpen(false);
      loadPets();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleDelete = (pet: Pet) => {
    modal.confirm({
      title: `确定删除宠物「${pet.name}」吗？`,
      content: '删除后无法恢复。',
      onOk: async () => {
        await petApi.delete(pet.id);
        message.success('删除成功');
        loadPets();
      },
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">🐾 宠物档案</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          添加宠物
        </Button>
      </div>

      {pets.length === 0 && !loading ? (
        <Empty description="还没有添加宠物档案，点击右上角添加您的第一只宠物吧！" />
      ) : (
        <div className="card-grid">
          {pets.map((pet) => (
            <Card
              key={pet.id}
              hoverable
              style={{ borderRadius: 12 }}
              bodyStyle={{ padding: 20 }}
              actions={[
                <InfoCircleOutlined key="detail" onClick={() => { setDetailPet(pet); setDetailOpen(true); }} />,
                <EditOutlined key="edit" onClick={() => openEdit(pet)} />,
                <DeleteOutlined key="delete" onClick={() => handleDelete(pet)} />,
              ]}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a7f3d0, #6ee7b7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, flexShrink: 0,
                  }}
                >
                  {petIcons[pet.pet_type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    {pet.name}
                    <Tag style={{ marginLeft: 8 }} color="blue">
                      {pet.gender === 'male' ? '♂ 公' : pet.gender === 'female' ? '♀ 母' : '未知'}
                    </Tag>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
                    {pet.breed} · {pet.age}岁 · {pet.weight || '?'}kg
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    {pet.is_vaccinated && <Tag color="green">已接种疫苗</Tag>}
                    {pet.is_neutered && <Tag color="purple">已绝育</Tag>}
                  </div>
                  <div style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6 }}>
                    {pet.personality}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={editing ? '编辑宠物信息' : '添加宠物'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="宠物名字" rules={[{ required: true, message: '请输入宠物名字' }]}>
                <Input placeholder="如：旺财" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pet_type" label="宠物类型" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'dog', label: '🐕 狗' },
                    { value: 'cat', label: '🐱 猫' },
                    { value: 'rabbit', label: '🐰 兔子' },
                    { value: 'bird', label: '🐦 鸟' },
                    { value: 'other', label: '🐾 其他' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="breed" label="品种" rules={[{ required: true }]}>
                <Input placeholder="如：金毛、英短" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="age" label="年龄（岁）" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'male', label: '♂ 公' },
                    { value: 'female', label: '♀ 母' },
                    { value: 'unknown', label: '未知' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weight" label="体重（kg）">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_vaccinated" label="已接种疫苗" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="personality" label="性格特点" rules={[{ required: true, message: '请描述宠物性格' }]}>
            <Input.TextArea rows={2} placeholder="如：温顺友好、活泼好动、胆小怕生等" />
          </Form.Item>
          <Form.Item name="diet_restrictions" label="饮食禁忌">
            <Input.TextArea rows={2} placeholder="如：不能吃葡萄、对鸡肉过敏等" />
          </Form.Item>
          <Form.Item name="health_notes" label="健康状况说明">
            <Input.TextArea rows={2} placeholder="如有慢性病、需定期服药等情况请说明" />
          </Form.Item>
          <Form.Item name="is_neutered" label="是否绝育" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${detailPet?.name} 的详细档案`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>关闭</Button>,
        ]}
        width={560}
      >
        {detailPet && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="宠物类型">
              {petIcons[detailPet.pet_type]} {
                { dog: '狗', cat: '猫', rabbit: '兔子', bird: '鸟', other: '其他' }[detailPet.pet_type]
              }
            </Descriptions.Item>
            <Descriptions.Item label="品种">{detailPet.breed}</Descriptions.Item>
            <Descriptions.Item label="年龄">{detailPet.age} 岁</Descriptions.Item>
            <Descriptions.Item label="性别">
              {detailPet.gender === 'male' ? '公' : detailPet.gender === 'female' ? '母' : '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="体重">{detailPet.weight || '未填写'} kg</Descriptions.Item>
            <Descriptions.Item label="性格特点">{detailPet.personality}</Descriptions.Item>
            <Descriptions.Item label="饮食禁忌">{detailPet.diet_restrictions || '无'}</Descriptions.Item>
            <Descriptions.Item label="健康状况">{detailPet.health_notes || '良好'}</Descriptions.Item>
            <Descriptions.Item label="疫苗接种">
              <Tag color={detailPet.is_vaccinated ? 'green' : 'red'}>
                {detailPet.is_vaccinated ? '已接种' : '未接种'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="绝育">
              <Tag color={detailPet.is_neutered ? 'purple' : 'default'}>
                {detailPet.is_neutered ? '已绝育' : '未绝育'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Pets;
