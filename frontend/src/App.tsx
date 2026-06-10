import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Space } from 'antd';
import {
  HomeOutlined,
  HeartOutlined,
  FileAddOutlined,
  TeamOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Pets from './pages/Pets';
import RequestForm from './pages/RequestForm';
import Caregivers from './pages/Caregivers';
import Orders from './pages/Orders';
import Statistics from './pages/Statistics';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页概览' },
    { key: '/pets', icon: <HeartOutlined />, label: '宠物档案' },
    { key: '/requests/new', icon: <FileAddOutlined />, label: '发布寄养需求' },
    { key: '/caregivers', icon: <TeamOutlined />, label: '代养人筛选' },
    { key: '/orders', icon: <ShoppingOutlined />, label: '订单跟踪' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
  ];

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        style={{ borderRight: '1px solid #e5e7eb' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: collapsed ? 20 : 18,
            fontWeight: 700,
            color: '#52c41a',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {collapsed ? '🐾' : '🐾 宠物互助寄养'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{ borderRight: 0, paddingTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: 'white',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
            社区宠物寄养匹配与代养评价平台
          </div>
          <Space>
            <Dropdown menu={userMenu}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />
                <span style={{ color: '#374151' }}>
                  {user?.username}
                  {profile && (
                    <span style={{ color: '#9ca3af', marginLeft: 6, fontSize: 12 }}>
                      ({profile.role === 'owner' ? '宠物主人' : profile.role === 'caregiver' ? '代养人' : '双重身份'})
                    </span>
                  )}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 0, background: '#f5f7fa' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pets" element={<Pets />} />
            <Route path="/requests/new" element={<RequestForm />} />
            <Route path="/caregivers" element={<Caregivers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
