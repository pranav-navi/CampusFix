import { useEffect, useState } from 'react';
import { App, Form, Input, Modal, Rate, Select } from 'antd';
import { complaintApi, departmentApi, userApi } from '../../api/services';
import { useMeta } from '../../context/MetaContext';
import { STATUS_META } from '../../utils/constants';
import { apiError } from '../../utils/format';
import ImagePicker from './ImagePicker';

/**
 * Every modal follows the same contract:
 *   open, onClose, complaint, onDone(responseFromApi)
 * The API returns the refreshed { complaint, history, permissions } for
 * mutations, so the detail page re-renders without a second request.
 */
function useSubmit(onDone, onClose, successText) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const run = async (fn) => {
    setLoading(true);
    try {
      const res = await fn();
      message.success(res?.message || successText);
      onDone(res);
      onClose();
    } catch (err) {
      message.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };
  return [loading, run];
}

/* ---------------- Admin ---------------- */

export function AssignModal({ open, onClose, complaint, onDone }) {
  const [form] = Form.useForm();
  const [loading, run] = useSubmit(onDone, onClose, 'Complaint assigned');
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const dept = Form.useWatch('department', form);

  useEffect(() => {
    if (!open) return;
    departmentApi.list().then((r) => setDepartments(r.departments || [])).catch(() => {});
    const currentDept = complaint.department?._id;
    // Pre-select the current assignment, or suggest the department that handles this category
    form.setFieldsValue({ department: currentDept, assignedTo: complaint.assignedTo?._id, note: '' });
  }, [open, complaint, form]);

  // Suggest a department by category once departments load (only when unassigned)
  useEffect(() => {
    if (open && !complaint.department && departments.length && !form.getFieldValue('department')) {
      const match = departments.find((d) => d.categories?.includes(complaint.category));
      if (match) form.setFieldsValue({ department: match._id });
    }
  }, [departments, open, complaint, form]);

  useEffect(() => {
    if (!dept) {
      setStaff([]);
      return;
    }
    setLoadingStaff(true);
    userApi
      .staff(dept)
      .then((r) => setStaff(r.staff || []))
      .catch(() => setStaff([]))
      .finally(() => setLoadingStaff(false));
  }, [dept]);

  return (
    <Modal
      title={complaint.department ? 'Reassign complaint' : 'Assign complaint'}
      open={open}
      onCancel={onClose}
      okText={complaint.department ? 'Reassign' : 'Assign'}
      confirmLoading={loading}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => run(() => complaintApi.assign(complaint._id, { ...v, assignedTo: v.assignedTo || null }))}
      >
        <Form.Item name="department" label="Department" rules={[{ required: true, message: 'Choose a department' }]}>
          <Select
            placeholder="Choose a department"
            showSearch
            optionFilterProp="label"
            onChange={() => form.setFieldsValue({ assignedTo: undefined })}
            options={departments.map((d) => ({
              value: d._id,
              label: d.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="assignedTo"
          label="Staff member"
          extra="Open jobs are shown so you can balance the workload."
        >
          <Select
            allowClear
            placeholder={dept ? 'Choose who will fix it' : 'Choose a department first'}
            disabled={!dept}
            loading={loadingStaff}
            notFoundContent={dept ? 'No active staff in this department' : null}
            options={staff.map((s) => ({
              value: s._id,
              label: `${s.name}${s.designation ? ` (${s.designation})` : ''} — ${s.openAssignments} open`,
            }))}
          />
        </Form.Item>
        <Form.Item name="note" label="Note for the record">
          <Input.TextArea rows={2} maxLength={2000} placeholder="Optional, visible to the student" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function StatusModal({ open, onClose, complaint, nextStatuses, onDone }) {
  const [form] = Form.useForm();
  const [loading, run] = useSubmit(onDone, onClose, 'Status updated');
  useEffect(() => {
    if (open) form.setFieldsValue({ status: nextStatuses[0], note: '' });
  }, [open, nextStatuses, form]);

  return (
    <Modal
      title="Change status"
      open={open}
      onCancel={onClose}
      okText="Update status"
      confirmLoading={loading}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-muted">
        Currently <strong>{complaint.status}</strong>. Only the next valid stages are listed.
      </p>
      <Form form={form} layout="vertical" onFinish={(v) => run(() => complaintApi.setStatus(complaint._id, v))}>
        <Form.Item name="status" label="New status" rules={[{ required: true }]}>
          <Select
            options={nextStatuses.map((s) => ({
              value: s,
              label: (
                <span>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: STATUS_META[s]?.color }} />
                  {s}
                </span>
              ),
            }))}
          />
        </Form.Item>
        <Form.Item name="note" label="Note">
          <Input.TextArea rows={3} maxLength={2000} placeholder="Optional, shown in the complaint history" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function RemarkModal({ open, onClose, complaint, onDone }) {
  const [form] = Form.useForm();
  const [loading, run] = useSubmit(onDone, onClose, 'Remark added');
  return (
    <Modal
      title="Add a remark"
      open={open}
      onCancel={onClose}
      okText="Add remark"
      confirmLoading={loading}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={(v) => run(() => complaintApi.addRemark(complaint._id, v.text))}>
        <Form.Item
          name="text"
          label="Remark"
          extra="The student is notified and sees this on the complaint."
          rules={[{ required: true, min: 2, message: 'Write a remark' }]}
        >
          <Input.TextArea rows={4} maxLength={2000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function PriorityModal({ open, onClose, complaint, onDone }) {
  const { priorities } = useMeta();
  const [value, setValue] = useState(complaint.priority);
  const [loading, run] = useSubmit(onDone, onClose, 'Priority updated');
  useEffect(() => {
    if (open) setValue(complaint.priority);
  }, [open, complaint.priority]);
  return (
    <Modal
      title="Change priority"
      open={open}
      onCancel={onClose}
      okText="Save priority"
      okButtonProps={{ disabled: value === complaint.priority }}
      confirmLoading={loading}
      onOk={() => run(() => complaintApi.setPriority(complaint._id, value))}
      destroyOnHidden
    >
      <Select className="w-full" value={value} onChange={setValue} options={priorities.map((p) => ({ value: p, label: p }))} />
    </Modal>
  );
}

/* ---------------- Staff ---------------- */

export function ProgressModal({ open, onClose, complaint, resolve, onDone }) {
  const [form] = Form.useForm();
  const [loading, run] = useSubmit(onDone, onClose, resolve ? 'Marked as resolved' : 'Update posted');
  return (
    <Modal
      title={resolve ? 'Mark as resolved' : 'Post a progress update'}
      open={open}
      onCancel={onClose}
      okText={resolve ? 'Mark as resolved' : 'Post update'}
      confirmLoading={loading}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ images: [] }}
        onFinish={({ images, text }) => run(() => complaintApi.addUpdate(complaint._id, { text, resolve }, images))}
      >
        <Form.Item
          name="text"
          label={resolve ? 'What was done to fix it?' : 'Update'}
          rules={[{ required: true, min: 2, message: resolve ? 'Describe the resolution' : 'Write an update' }]}
        >
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            placeholder={resolve ? 'e.g. Replaced the faulty capacitor and tested the fan at all speeds.' : 'e.g. Spare part ordered, expected tomorrow.'}
          />
        </Form.Item>
        <Form.Item name="images" label={resolve ? 'Photos of the completed work' : 'Photos'}>
          <ImagePicker />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ---------------- Student ---------------- */

export function EditModal({ open, onClose, complaint, onDone }) {
  const [form] = Form.useForm();
  const { categories, priorities } = useMeta();
  const [loading, run] = useSubmit(onDone, onClose, 'Complaint updated');
  useEffect(() => {
    if (open) form.setFieldsValue(complaint);
  }, [open, complaint, form]);
  return (
    <Modal title="Edit complaint" open={open} onCancel={onClose} okText="Save changes" confirmLoading={loading} onOk={() => form.submit()} destroyOnHidden width={620}>
      <Form
        form={form}
        layout="vertical"
        onFinish={({ title, description, category, location, priority }) =>
          run(() => complaintApi.update(complaint._id, { title, description, category, location, priority }))
        }
      >
        <Form.Item name="title" label="Title" rules={[{ required: true, min: 5, max: 120 }]}>
          <Input maxLength={120} />
        </Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-3">
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select options={priorities.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Input maxLength={150} />
          </Form.Item>
        </div>
        <Form.Item name="description" label="Description" rules={[{ required: true, min: 10 }]}>
          <Input.TextArea rows={5} maxLength={3000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function ReopenModal({ open, onClose, complaint, onDone }) {
  const [form] = Form.useForm();
  const [loading, run] = useSubmit(onDone, onClose, 'Complaint reopened');
  return (
    <Modal title="Reopen complaint" open={open} onCancel={onClose} okText="Reopen" okButtonProps={{ danger: true }} confirmLoading={loading} onOk={() => form.submit()} destroyOnHidden>
      <p className="mb-4 text-sm text-muted">Reopen only if the same problem is back or wasn't fully fixed. The department will be notified.</p>
      <Form form={form} layout="vertical" onFinish={(v) => run(() => complaintApi.reopen(complaint._id, v.reason))}>
        <Form.Item name="reason" label="What's still wrong?" rules={[{ required: true, min: 5, message: 'Explain in a few words (5+ characters)' }]}>
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

const RATING_TEXT = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

export function FeedbackModal({ open, onClose, complaint, onDone }) {
  const [form] = Form.useForm();
  const rating = Form.useWatch('rating', form);
  const [loading, run] = useSubmit(
    async (res) => onDone(await complaintApi.get(complaint._id).then((r) => ({ ...r, message: res.message }))),
    onClose,
    'Thanks for your feedback'
  );
  return (
    <Modal title="Rate the resolution" open={open} onCancel={onClose} okText="Submit rating" confirmLoading={loading} onOk={() => form.submit()} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={(v) => run(() => complaintApi.feedback(complaint._id, v))}>
        <Form.Item label="How well was it fixed?" required>
          <div className="flex items-center gap-3">
            <Form.Item name="rating" noStyle rules={[{ required: true, message: 'Choose a rating' }]}>
              <Rate />
            </Form.Item>
            {rating ? <span className="text-sm text-muted">{RATING_TEXT[rating - 1]}</span> : null}
          </div>
        </Form.Item>
        <Form.Item name="comment" label="Comments">
          <Input.TextArea rows={3} maxLength={1000} placeholder="Optional" showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
