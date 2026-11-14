import { useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Select, Switch, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { departmentApi } from '../../api/services';
import { useMeta } from '../../context/MetaContext';
import useAsync from '../../hooks/useAsync';
import { apiError } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';

function DepartmentModal({ open, onClose, department, onSaved }) {
  const [form] = Form.useForm();
  const { categories } = useMeta();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const editing = Boolean(department);

  useEffect(() => {
    if (open) form.setFieldsValue(department || { isActive: true, categories: [] });
  }, [open, department, form]);

  const save = async (values) => {
    setSaving(true);
    try {
      const body = { ...values, code: values.code?.toUpperCase() };
      if (editing) await departmentApi.update(department._id, body);
      else await departmentApi.create(body);
      message.success(editing ? 'Department updated' : 'Department created');
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
      title={editing ? `Edit ${department.name}` : 'New department'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={editing ? 'Save changes' : 'Create department'}
      confirmLoading={saving}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={save}>
        <div className="grid gap-x-3 sm:grid-cols-[2fr_1fr]">
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2, message: 'Enter a department name' }]}>
            <Input placeholder="e.g. Electrical Maintenance" />
          </Form.Item>
          <Form.Item
            name="code"
            label="Short code"
            rules={[
              { required: true, message: 'Enter a code' },
              { pattern: /^[A-Za-z0-9]{2,10}$/, message: '2–10 letters or numbers' },
            ]}
          >
            <Input placeholder="ELEC" maxLength={10} />
          </Form.Item>
        </div>
        <Form.Item name="description" label="What does this department handle?">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Form.Item name="categories" label="Complaint categories" extra="Used to suggest this department when assigning complaints.">
          <Select mode="multiple" options={categories.map((c) => ({ value: c, label: c }))} placeholder="Choose categories" />
        </Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="contactEmail" label="Contact email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="Contact phone">
            <Input />
          </Form.Item>
        </div>
        <Form.Item name="isActive" label="Accepting complaints" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function Departments() {
  const { message, modal } = App.useApp();
  const { data, loading, reload } = useAsync(() => departmentApi.list({ withStats: 'true', all: 'true' }), []);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, dept = edit
  const [search, setSearch] = useState('');

  const rows = (data?.departments || []).filter((d) =>
    `${d.name} ${d.code}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggleActive = async (d) => {
    try {
      await departmentApi.update(d._id, { isActive: !d.isActive });
      message.success(d.isActive ? `${d.name} deactivated` : `${d.name} activated`);
      reload();
    } catch (err) {
      message.error(apiError(err));
    }
  };

  const remove = (d) =>
    modal.confirm({
      title: `Delete ${d.name}?`,
      content: 'Departments with staff or complaints cannot be deleted; deactivate them instead.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await departmentApi.remove(d._id);
          message.success('Department deleted');
          reload();
        } catch (err) {
          message.error(apiError(err));
        }
      },
    });

  const columns = [
    {
      title: 'Department',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, d) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{d.name}</span>
            <Tag>{d.code}</Tag>
          </div>
          <div className="max-w-md text-xs text-muted">{d.description}</div>
        </div>
      ),
    },
    {
      title: 'Handles',
      dataIndex: 'categories',
      key: 'categories',
      responsive: ['lg'],
      render: (cats = []) => (cats.length ? cats.map((c) => <Tag key={c}>{c}</Tag>) : <span className="text-muted">—</span>),
    },
    { title: 'Staff', dataIndex: 'staffCount', key: 'staff', align: 'right', sorter: (a, b) => a.staffCount - b.staffCount },
    { title: 'Open', dataIndex: 'openCount', key: 'open', align: 'right', sorter: (a, b) => a.openCount - b.openCount },
    { title: 'Resolved', dataIndex: 'resolvedCount', key: 'resolved', align: 'right' },
    {
      title: 'Active',
      key: 'active',
      align: 'center',
      render: (_, d) => <Switch size="small" checked={d.isActive} onChange={() => toggleActive(d)} aria-label="Active" />,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, d) => (
        <div className="flex justify-end gap-1">
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(d)} aria-label={`Delete ${d.name}`} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Departments"
        description="The teams complaints are assigned to. Deactivate a department to stop new assignments without losing its history."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>
            New department
          </Button>
        }
      />
      <div className="panel">
        <div className="border-b border-line p-4">
          <Input.Search allowClear placeholder="Search departments" onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <Table rowKey="_id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10, hideOnSinglePage: true }} scroll={{ x: 760 }} />
      </div>
      <DepartmentModal
        open={editing !== null}
        department={editing && editing._id ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />
    </>
  );
}
