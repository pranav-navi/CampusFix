import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import enGB from 'antd/locale/en_GB';
import { AuthProvider } from './context/AuthContext';
import { MetaProvider } from './context/MetaContext';
import App from './App';
import './index.css';

const theme = {
  token: {
    colorPrimary: '#1f4e8c',
    colorInfo: '#1f4e8c',
    colorSuccess: '#15803d',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorTextBase: '#1b2433',
    colorBorder: '#d6dde8',
    colorBorderSecondary: '#e2e7ef',
    colorBgLayout: '#f4f6fa',
    colorSuccessBg: '#edf7f0',
    colorSuccessBorder: '#bfe0cb',
    colorWarningBg: '#fdf6ea',
    colorWarningBorder: '#f3d6a6',
    colorErrorBg: '#fdf0f0',
    colorErrorBorder: '#f5c2c2',
    borderRadius: 8,
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  components: {
    Layout: { siderBg: '#13294b', headerBg: '#ffffff', bodyBg: '#f4f6fa' },
    Menu: {
      darkItemBg: '#13294b',
      darkSubMenuItemBg: '#13294b',
      darkItemSelectedBg: '#1f4e8c',
      darkItemColor: 'rgba(255,255,255,0.72)',
      darkItemHoverColor: '#ffffff',
      itemHeight: 44,
      itemMarginInline: 12,
      itemBorderRadius: 8,
    },
    Table: { headerBg: '#f7f9fc', headerColor: '#5b677a', rowHoverBg: '#f4f7fc' },
    Button: { fontWeight: 600, primaryShadow: 'none' },
    Card: { borderRadiusLG: 10 },
    Select: { optionSelectedBg: '#e8eef8', optionSelectedColor: '#13294b' },
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* layer: antd styles go into @layer antd, below Tailwind utilities (see index.css) */}
    <StyleProvider layer>
    <ConfigProvider theme={theme} locale={enGB}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <MetaProvider>
              <App />
            </MetaProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
    </StyleProvider>
  </StrictMode>
);
