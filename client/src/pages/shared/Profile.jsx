import { useState } from 'react';
import { App, Avatar, Button, Descriptions, Form, Input } from 'antd';
import { authApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL } from '../../utils/constants';
import { apiError, formatDate, initials } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Panel from '../../components/common/Panel';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { message } = App.useApp();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwForm] = Form.useForm();

  const saveProfile = async (values) => {
    setSavingProfile(true);
    try {
      const body = user.role === 'student' ? values : { name: values.name, phone: values.phone };
      const r = await authApi.updateMe(body);
      setUser(r.user);
      message.success('Profile saved');
    } catch (err) {
      message.error(apiError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      message.success('Password changed');
      pwForm.resetFields();
    } catch (err) {
      message.error(apiError(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel>
          <div className="flex items-center gap-4">
            <Avatar size={64} style={{ background: '#1f4e8c', fontSize: 24 }}>
              {initials(user.name)}
            </Avatar>
            <div>
              <h2 className="text-xl font-extrabold">{user.name}</h2>
              <p className="text-sm text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <Descriptions
            className="mt-5"
            column={1}
            size="small"
            items={[
              { key: 'email', label: 'Email', children: user.email },
              ...(user.studentId ? [{ key: 'sid', label: 'Roll number', children: user.studentId }] : []),
              ...(user.department ? [{ key: 'dept', label: 'Department', children: user.department.name }] : []),
              ...(user.designation ? [{ key: 'des', label: 'Designation', children: user.designation }] : []),
              { key: 'since', label: 'Member since', children: formatDate(user.createdAt) },
            ]}
          />
        </Panel>

        <div className="space-y-6">
          <Panel title="Contact details">
            <Form layout="vertical" initialValues={user} onFinish={saveProfile}>
              <div className="grid gap-x-3 sm:grid-cols-2">
                <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2 }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="phone" label="Phone" rules={[{ pattern: /^[0-9+\-\s]{7,15}$/, message: 'Enter a valid phone number' }]}>
                  <Input />
                </Form.Item>
              </div>
              {user.role === 'student' && (
                <Form.Item name="course" label="Course">
                  <Input />
                </Form.Item>
              )}
              <Button type="primary" htmlType="submit" loading={savingProfile}>
                Save profile
              </Button>
            </Form>
          </Panel>

          <Panel title="Change password">
            <Form form={pwForm} layout="vertical" onFinish={changePassword}>
              <Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <div className="grid gap-x-3 sm:grid-cols-2">
                <Form.Item name="newPassword" label="New password" rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}>
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  name="confirm"
                  label="Confirm new password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Re-enter the new password' },
                    ({ getFieldValue }) => ({
                      validator: (_, v) =>
                        !v || v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')),
                    }),
                  ]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </div>
              <Button htmlType="submit" loading={savingPassword}>
                Change password
              </Button>
            </Form>
          </Panel>
        </div>
      </div>
    </>
  );
}
