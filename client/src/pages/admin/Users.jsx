import { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Button, Dropdown, Form, Input, Modal, Select, Table, Tabs, Tag } from 'antd';
import { MoreOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { departmentApi, userApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { ROLE_LABEL } from '../../utils/constants';
import { apiError, formatDate, fromNow, initials } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';

function UserModal({ open, onClose, user, defaultRole, departments, onSaved }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const editing = Boolean(user);
  const role = Form.useWatch('role', form) || user?.role;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      editing
        ? { ...user, department: user.department?._id, password: undefined }
        : { role: defaultRole }
    );
  }, [open, user, defaultRole, editing, form]);

  const save = async (values) => {
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== ''));
      if (editing) {
        delete body.role;
        delete body.email;
        await userApi.update(user._id, body);
      } else {
        await userApi.create(body);
      }
      message.success(editing ? 'Account updated' : `${ROLE_LABEL[values.role]} account created`);
      onSaved();
      onClose();
    } catch (err) {
      message.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${user.name}` : 'New account'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={editing ? 'Save changes' : 'Create account'}
      confirmLoading={saving}
      destroyOnHidden
      width={580}
    >
      <Form form={form} layout="vertical" onFinish={save}>
        {!editing && (
          <Form.Item name="role" label="Account type" rules={[{ required: true }]}>
            <Select
              options={['staff', 'student', 'admin'].map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </Form.Item>
        )}
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: !editing, type: 'email' }]}>
            <Input disabled={editing} />
          </Form.Item>
        </div>
        {role === 'staff' && (
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name="department" label="Department" rules={[{ required: true, message: 'Choose a department' }]}>
              <Select options={departments.map((d) => ({ value: d._id, label: d.name }))} placeholder="Choose" />
            </Form.Item>
            <Form.Item name="designation" label="Designation">
              <Input placeholder="e.g. Electrician" />
            </Form.Item>
          </div>
        )}
        {role === 'student' && (
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name="studentId" label="Roll number" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="course" label="Course">
              <Input />
            </Form.Item>
          </div>
        )}
        {role === 'admin' && (
          <Form.Item name="designation" label="Designation">
            <Input placeholder="e.g. Dean, Student Welfare" />
          </Form.Item>
        )}
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? 'Set a new password' : 'Temporary password'}
            rules={[{ required: !editing, min: 6, message: 'At least 6 characters' }]}
            extra={editing ? 'Leave empty to keep the current password.' : undefined}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const { message, modal } = App.useApp();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || 'student';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [table, setTable] = useState({ page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' });
  const [modalState, setModalState] = useState(null); // null | 'new' | user

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setTable((t) => ({ ...t, page: 1 })), [role, debounced, status, department]);

  const query = useMemo(
    () => ({ role, search: debounced, isActive: status, department: role === 'staff' ? department : '', ...table }),
    [role, debounced, status, department, table]
  );
  const { data, loading, reload } = useAsync(() => userApi.list(query), [query]);
  const { data: deptData } = useAsync(() => departmentApi.list(), []);
  const departments = deptData?.departments || [];

  const setActive = async (u, isActive) => {
    try {
      await userApi.update(u._id, { isActive });
      message.success(isActive ? `${u.name} can log in again` : `${u.name} has been deactivated`);
      reload();
    } catch (err) {
      message.error(apiError(err));
    }
  };

  const remove = (u) =>
    modal.confirm({
      title: `Delete ${u.name}'s account?`,
      content: 'Accounts linked to complaints cannot be deleted; deactivate them instead.',
      okText: 'Delete account',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await userApi.remove(u._id);
          message.success('Account deleted');
          reload();
        } catch (err) {
          message.error(apiError(err));
        }
      },
    });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (_, u) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ background: u.isActive ? '#1f4e8c' : '#94a3b8' }}>{initials(u.name)}</Avatar>
          <div>
            <div className="font-semibold text-ink">
              {u.name} {u._id === me._id && <Tag className="ml-1">You</Tag>}
            </div>
            <div className="text-xs text-muted">{u.email}</div>
          </div>
        </div>
      ),
    },
    role === 'student' && { title: 'Roll number', dataIndex: 'studentId', key: 'studentId' },
    role === 'student' && { title: 'Course', dataIndex: 'course', key: 'course', responsive: ['lg'] },
    role === 'student' && { title: 'Complaints', dataIndex: 'complaintCount', key: 'cc', align: 'right' },
    role === 'staff' && {
      title: 'Department',
      key: 'dept',
      render: (_, u) => (
        <div>
          <div>{u.department?.name || '—'}</div>
          <div className="text-xs text-muted">{u.designation}</div>
        </div>
      ),
    },
    role === 'staff' && {
      title: 'Assigned / resolved',
      key: 'work',
      align: 'right',
      render: (_, u) => `${u.assignedCount} / ${u.resolvedCount}`,
    },
    role === 'admin' && { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (a) => (a ? <Tag color="green">Active</Tag> : <Tag>Deactivated</Tag>),
    },
    {
      title: 'Last login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      sorter: true,
      responsive: ['md'],
      render: (d) => <span className="text-sm text-muted">{d ? fromNow(d) : 'Never'}</span>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      responsive: ['xl'],
      render: (d) => <span className="text-sm text-muted">{formatDate(d)}</span>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, u) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'edit', label: 'Edit account' },
              u._id !== me._id && (u.isActive ? { key: 'deactivate', label: 'Deactivate' } : { key: 'activate', label: 'Activate' }),
              u._id !== me._id && { type: 'divider' },
              u._id !== me._id && { key: 'delete', label: 'Delete', danger: true },
            ].filter(Boolean),
            onClick: ({ key }) => {
              if (key === 'edit') setModalState(u);
              if (key === 'deactivate') setActive(u, false);
              if (key === 'activate') setActive(u, true);
              if (key === 'delete') remove(u);
            },
          }}
        >
          <Button type="text" icon={<MoreOutlined />} aria-label={`Actions for ${u.name}`} />
        </Dropdown>
      ),
    },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage student, staff and administrator accounts."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalState('new')}>
            New account
          </Button>
        }
      />
      <div className="panel">
        <Tabs
          activeKey={role}
          onChange={(k) => setParams({ role: k })}
          className="px-4"
          items={[
            { key: 'student', label: 'Students' },
            { key: 'staff', label: 'Department staff' },
            { key: 'admin', label: 'Administrators' },
          ]}
        />
        <div className="flex flex-wrap gap-2 border-b border-line px-4 pb-4">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-muted" />}
            placeholder={role === 'student' ? 'Search name, email or roll no.' : 'Search name or email'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[280px]"
          />
          {role === 'staff' && (
            <Select
              allowClear
              placeholder="Department"
              className="min-w-[200px]"
              value={department || undefined}
              onChange={(v) => setDepartment(v || '')}
              options={departments.map((d) => ({ value: d._id, label: d.name }))}
            />
          )}
          <Select
            allowClear
            placeholder="Status"
            className="min-w-[140px]"
            value={status || undefined}
            onChange={(v) => setStatus(v || '')}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Deactivated' },
            ]}
          />
        </div>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data?.items || []}
          loading={loading}
          scroll={{ x: 760 }}
          onChange={(p, _f, s) =>
            setTable({
              page: p.current,
              limit: p.pageSize,
              sortBy: s.order ? s.columnKey : 'createdAt',
              order: s.order === 'ascend' ? 'asc' : 'desc',
            })
          }
          pagination={{
            current: table.page,
            pageSize: table.limit,
            total: data?.pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (t) => `${t} accounts`,
          }}
        />
      </div>
      <UserModal
        open={modalState !== null}
        user={modalState && modalState !== 'new' ? modalState : null}
        defaultRole={role}
        departments={departments}
        onClose={() => setModalState(null)}
        onSaved={reload}
      />
    </>
  );
}
