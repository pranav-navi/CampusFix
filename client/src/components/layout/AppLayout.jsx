import { useMemo, useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  FileAddOutlined,
  LogoutOutlined,
  MenuOutlined,
  ProfileOutlined,
  StarOutlined,
  TeamOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL } from '../../utils/constants';
import { initials } from '../../utils/format';
import NotificationBell from './NotificationBell';

const { Sider, Header, Content } = Layout;

const NAV = {
  student: [
    { key: '/student', icon: <AppstoreOutlined />, label: 'Dashboard' },
    { key: '/student/complaints/new', icon: <FileAddOutlined />, label: 'Report an issue' },
    { key: '/student/complaints', icon: <UnorderedListOutlined />, label: 'My complaints' },
  ],
  admin: [
    { key: '/admin', icon: <AppstoreOutlined />, label: 'Dashboard' },
    { key: '/admin/complaints', icon: <UnorderedListOutlined />, label: 'All complaints' },
    { key: '/admin/analytics', icon: <BarChartOutlined />, label: 'Analytics' },
    { key: '/admin/departments', icon: <ApartmentOutlined />, label: 'Departments' },
    { key: '/admin/users', icon: <TeamOutlined />, label: 'Users' },
    { key: '/admin/feedback', icon: <StarOutlined />, label: 'Feedback' },
  ],
  staff: [
    { key: '/staff', icon: <AppstoreOutlined />, label: 'Dashboard' },
    { key: '/staff/complaints', icon: <ToolOutlined />, label: 'Assigned to me' },
    { key: '/staff/feedback', icon: <StarOutlined />, label: 'My ratings' },
  ],
};

const SIDER_BG = '#13294b';

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-5 py-5 no-underline">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#ffffff" />
        <path d="M9 17.5l4.5 4.5L23 11" fill="none" stroke="#13294b" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight text-white">CampusFix</span>
    </Link>
  );
}

function SideNav({ items, selected, onNavigate }) {
  return (
    <div className="sidebar-scroll flex h-full flex-col overflow-y-auto" style={{ background: SIDER_BG }}>
      <Brand />
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selected]}
        items={items}
        onClick={({ key }) => onNavigate(key)}
        style={{ background: 'transparent', borderInlineEnd: 0 }}
      />
      <div className="mt-auto px-5 py-5 text-xs leading-relaxed text-white/50">
        Report it once. Follow it to the fix.
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg ?? true; // breakpoints are undefined on first paint
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = NAV[user.role];
  // Longest nav key that prefixes the path wins, so /student/complaints/123 highlights "My complaints"
  const selected = useMemo(() => {
    const exact = items.find((i) => i.key === pathname);
    if (exact) return exact.key;
    return (
      items
        .filter((i) => pathname.startsWith(`${i.key}/`) && i.key.split('/').length > 2)
        .sort((a, b) => b.key.length - a.key.length)[0]?.key || items[0].key
    );
  }, [items, pathname]);

  const go = (key) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <ProfileOutlined />, label: 'My profile' },
      { key: 'notifications', icon: <BellOutlined />, label: 'Notifications' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') {
        logout();
        navigate('/login', { replace: true });
      } else navigate(`/${key}`);
    },
  };

  return (
    <Layout className="min-h-screen" style={{ background: SIDER_BG }}>
      {isDesktop && (
        <Sider width={240} style={{ background: SIDER_BG, position: 'sticky', top: 0, height: '100vh' }}>
          <SideNav items={items} selected={selected} onNavigate={go} />
        </Sider>
      )}
      <Drawer
        placement="left"
        open={!isDesktop && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={250}
        closable={false}
        styles={{ body: { padding: 0, background: SIDER_BG } }}
      >
        <SideNav items={items} selected={selected} onNavigate={go} />
      </Drawer>

      <Layout style={{ background: 'var(--color-canvas)' }}>
        <Header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line"
          style={{ background: '#ffffff', paddingInline: isDesktop ? 28 : 12, height: 60, lineHeight: '60px' }}
        >
          <div className="flex items-center gap-2">
            {!isDesktop && (
              <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="Open menu" />
            )}
            <span className="text-sm text-muted">{ROLE_LABEL[user.role]} workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-2 py-1 hover:bg-canvas"
                style={{ font: 'inherit' }}
              >
                <Avatar style={{ background: '#1f4e8c' }} icon={!user.name && <UserOutlined />}>
                  {initials(user.name)}
                </Avatar>
                {isDesktop && (
                  <span className="text-left leading-tight">
                    <span className="block text-sm font-bold text-ink">{user.name}</span>
                    <span className="block text-xs text-muted">
                      {user.role === 'staff' ? user.department?.name || 'Staff' : user.email}
                    </span>
                  </span>
                )}
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content className="px-3 py-6 sm:px-7">
          <div className="mx-auto max-w-[1280px]">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
