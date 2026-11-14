import { useState } from 'react';
import { Alert, App, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../utils/constants';
import { apiError } from '../../utils/format';
import AuthShell from './AuthShell';

// Demo buttons appear only when VITE_SHOW_DEMO_ACCOUNTS=true in client/.env
// (use it together with `npm run seed`; hidden after `npm run reset`)
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';
const DEMO = [
  { role: 'Student', email: 'student@campusfix.edu', password: 'Student@123' },
  { role: 'Admin', email: 'admin@campusfix.edu', password: 'Admin@123' },
  { role: 'Staff', email: 'staff@campusfix.edu', password: 'Staff@123' },
];

export default function Login() {
  const [form] = Form.useForm();
  const { login } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async ({ email, password }) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      message.success(`Welcome back, ${user.name.split(' ')[0]}`);
      const from = location.state?.from?.pathname;
      navigate(from && from.startsWith(ROLE_HOME[user.role]) ? from : ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(apiError(err, 'Could not reach the server. Is the API running?'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-[28px] font-extrabold">Log in</h2>
      <p className="mt-1 text-sm text-muted">Use your campus email to continue.</p>

      {error && <Alert type="error" title={error} showIcon className="mt-5" />}

      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} className="mt-6" size="large">
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Enter your email' },
            { type: 'email', message: 'Enter a valid email address' },
          ]}
        >
          <Input prefix={<MailOutlined className="text-muted" />} placeholder="you@campusfix.edu" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
          <Input.Password prefix={<LockOutlined className="text-muted" />} placeholder="Your password" autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Log in
        </Button>
      </Form>

      <p className="mt-5 text-center text-sm text-muted">
        New student? <Link to="/register" className="font-semibold text-navy">Create an account</Link>
      </p>

      {SHOW_DEMO && (
      <div className="mt-8 rounded-lg border border-dashed border-line bg-canvas p-4">
        <p className="text-sm font-bold text-ink">Demo accounts</p>
        <p className="mt-0.5 text-xs text-muted">Fill the form with a seeded account to walk through the full workflow.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO.map((d) => (
            <Button key={d.role} onClick={() => form.setFieldsValue({ email: d.email, password: d.password })}>
              {d.role}
            </Button>
          ))}
        </div>
      </div>
      )}
    </AuthShell>
  );
}
