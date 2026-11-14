import { useState } from 'react';
import { Alert, App, Button, Form, Input } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../utils/format';
import AuthShell from './AuthShell';

export default function Register() {
  const { register } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (values) => {
    const { confirm, ...body } = values;
    setLoading(true);
    setError('');
    try {
      await register(body);
      message.success('Account created. You can report your first issue now.');
      navigate('/student', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-[28px] font-extrabold">Create a student account</h2>
      <p className="mt-1 text-sm text-muted">Staff and administrator accounts are created by the admin office.</p>

      {error && <Alert type="error" title={error} showIcon className="mt-5" />}

      <Form layout="vertical" requiredMark={false} onFinish={submit} className="mt-6">
        <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2, message: 'Enter your full name' }]}>
          <Input placeholder="e.g. Simran Kaur" autoComplete="name" />
        </Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="studentId" label="Roll number" rules={[{ required: true, message: 'Enter your roll number' }]}>
            <Input placeholder="e.g. MCA2025-014" />
          </Form.Item>
          <Form.Item name="course" label="Course">
            <Input placeholder="e.g. MCA" />
          </Form.Item>
        </div>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="you@college.edu" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ pattern: /^[0-9+\-\s]{7,15}$/, message: 'Enter a valid phone number' }]}
          >
            <Input placeholder="Optional" autoComplete="tel" />
          </Form.Item>
        </div>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: 6, message: 'Use at least 6 characters' }]}
          hasFeedback
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm password"
          dependencies={['password']}
          hasFeedback
          rules={[
            { required: true, message: 'Re-enter your password' },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Create account
        </Button>
      </Form>

      <p className="mt-5 text-center text-sm text-muted">
        Already registered? <Link to="/login" className="font-semibold text-navy">Log in</Link>
      </p>
    </AuthShell>
  );
}
