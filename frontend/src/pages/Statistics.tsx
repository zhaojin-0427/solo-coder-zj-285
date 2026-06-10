import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Empty, Spin, Tag, Avatar, List, Select, Space,
} from 'antd';
import {
  TeamOutlined, HeartOutlined, ShoppingOutlined,
  WarningOutlined, CheckCircleOutlined, StarOutlined,
  EnvironmentOutlined, SyncOutlined, SolutionOutlined,
  ClockCircleOutlined, CarryOutOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { statsApi, profileApi } from '../api';
import type { Statistics } from '../types';

const COLORS = ['#52c41a', '#1890ff', '#faad14', '#722ed1', '#eb2f96', '#13c2c2', '#fa541c'];

const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>(undefined);
  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    loadStats();
    loadDistricts();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedDistrict]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedDistrict) {
        params.district = selectedDistrict;
      }
      const res = await statsApi.get(params);
      setStats(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async () => {
    try {
      const res = await profileApi.list();
      const profiles = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      const districtSet = new Set<string>();
      profiles.forEach((p: any) => {
        if (p.district) districtSet.add(p.district);
      });
      setDistricts(Array.from(districtSet));
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return <Empty description="暂无统计数据" />;
  }

  const { overview, district_activity, district_orders, top_caregivers, abnormal_by_type, order_trend, avg_reviews, current_district } = stats;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">📊 数据统计</div>
        <Space>
          <span style={{ color: '#6b7280' }}>按片区查看：</span>
          <Select
            style={{ width: 200 }}
            placeholder="选择片区（全部）"
            allowClear
            value={selectedDistrict}
            onChange={(v) => setSelectedDistrict(v)}
            options={districts.map(d => ({ value: d, label: d }))}
          />
        </Space>
      </div>

      {current_district && (
        <Tag color="blue" style={{ marginBottom: 16 }}>
          <EnvironmentOutlined /> 当前筛选片区：{current_district}
        </Tag>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>总用户数</span>}
              value={overview.total_users}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>注册宠物</span>}
              value={overview.total_pets}
              prefix={<HeartOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>认证代养人</span>}
              value={overview.total_caregivers}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>总订单数</span>}
              value={overview.total_orders}
              prefix={<ShoppingOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={overview.completion_rate}
                strokeColor="#52c41a"
                size="small"
              />
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> 完成率 {overview.completion_rate}%
                （{overview.completed_orders}/{overview.total_orders}）
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>变更成功率</span>}
              value={overview.change_success_rate}
              suffix="%"
              prefix={<SyncOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> 成功 {overview.approved_changes || 0} / 共 {overview.total_changes || 0} 单
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>争议率</span>}
              value={overview.dispute_rate}
              suffix="%"
              prefix={<SolutionOutlined style={{ color: '#fa541c' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              <WarningOutlined style={{ color: '#fa541c' }} /> 争议订单 {overview.disputed_orders || 0} / 共 {overview.total_orders || 0} 单
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>平均协商时长</span>}
              value={overview.avg_negotiation_hours}
              suffix="小时"
              prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#1f2937' }}
              precision={1}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              从争议发起到解决的平均耗时
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ color: '#6b7280' }}>异常升级后完结率</span>}
              value={overview.escalation_resolution_rate}
              suffix="%"
              prefix={<CarryOutOutlined style={{ color: '#eb2f96' }} />}
              valueStyle={{ color: '#1f2937' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> 已解决 {overview.escalated_resolved || 0} / 升级 {overview.escalated_count || 0} 次
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="📊 各片区代养活跃度" extra={<span style={{ color: '#6b7280' }}>用户分布</span>}>
            {district_activity.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={district_activity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="district" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#52c41a" name="用户数" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="📦 各片区订单完成情况">
            {district_orders.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={district_orders}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="district" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="总订单" fill="#1890ff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="已完成" fill="#52c41a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card title="🏆 好评率最高代养人 TOP5">
            {top_caregivers.length === 0 ? (
              <Empty />
            ) : (
              <List
                dataSource={top_caregivers}
                renderItem={(cg, idx) => (
                  <List.Item>
                    <Row align="middle" style={{ width: '100%' }}>
                      <Col span={2}>
                        <Tag color={idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? '#cd7f32' : 'default'} style={{ fontSize: 14, fontWeight: 700 }}>
                          {idx + 1}
                        </Tag>
                      </Col>
                      <Col span={4}>
                        <Avatar style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                          {cg.username?.charAt(0).toUpperCase()}
                        </Avatar>
                      </Col>
                      <Col span={10}>
                        <div style={{ fontWeight: 500 }}>{cg.username}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          <EnvironmentOutlined /> {cg.district}
                        </div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <div style={{ color: '#faad14', fontWeight: 600 }}>
                          <StarOutlined /> {cg.rating}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {cg.review_count}评价 · {cg.completed_orders}单
                        </div>
                      </Col>
                    </Row>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title="⚠️ 宠物行为异常率分析"
            extra={
              <Tag color={overview.abnormal_rate > 10 ? 'red' : 'green'} icon={<WarningOutlined />}>
                总体异常率：{overview.abnormal_rate}%
              </Tag>
            }
          >
            <Row gutter={16}>
              <Col xs={24} md={10}>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '正常记录', value: overview.total_records - overview.abnormal_records },
                          { name: '异常记录', value: overview.abnormal_records },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#52c41a" />
                        <Cell fill="#ff4d4f" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Col>
              <Col xs={24} md={14}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  按宠物类型异常分布
                </div>
                {abnormal_by_type.length === 0 ? (
                  <Empty description="暂无异常数据" style={{ padding: 30 }} />
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={abnormal_by_type}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="order_pet_type"
                          tickFormatter={(v) => ({ dog: '狗', cat: '猫', rabbit: '兔', bird: '鸟', other: '其他' }[v] || v)}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name, props) => [
                            value,
                            '异常次数',
                          ]}
                          labelFormatter={(v) => ({ dog: '🐕 狗', cat: '🐱 猫', rabbit: '🐰 兔', bird: '🐦 鸟', other: '🐾 其他' }[v] || v)}
                        />
                        <Bar dataKey="count" name="异常次数" radius={[4, 4, 0, 0]}>
                          {abnormal_by_type.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="📈 订单趋势（近30天）">
            {order_trend.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={order_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => v?.slice(5)} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="订单数"
                      stroke="#52c41a"
                      strokeWidth={3}
                      dot={{ fill: '#52c41a', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="⭐ 平均评分对比">
            {avg_reviews.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ padding: '20px 0' }}>
                {avg_reviews.map((r, idx) => (
                  <div key={r.role} style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500 }}>
                        {r.role === 'owner' ? '🐾 主人对代养人评价' : '👥 代养人对主人评价'}
                      </span>
                      <span style={{ color: '#faad14', fontWeight: 600 }}>
                        {r.avg_rating?.toFixed(2)} / 5.0
                      </span>
                    </div>
                    <Progress
                      percent={((r.avg_rating || 0) / 5) * 100}
                      showInfo={false}
                      strokeColor={COLORS[idx]}
                    />
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      共 {r.count} 条评价
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;
