import { useState } from 'react';
import { App, Button, Form, Input, Radio, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { complaintApi } from '../../api/services';
import { useMeta } from '../../context/MetaContext';
import { MAX_IMAGE_MB, MAX_IMAGES, PRIORITY_META } from '../../utils/constants';
import { apiError } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Panel from '../../components/common/Panel';
import ImagePicker from '../../components/complaints/ImagePicker';

const PRIORITY_HELP = {
  Low: 'Cosmetic or minor — can wait a few days',
  Medium: 'Affects daily use but there is a workaround',
  High: 'Disrupts classes, labs or hostel life',
  Urgent: 'Safety risk or affects many people right now',
};

export default function NewComplaint() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { categories, priorities } = useMeta();
  const [submitting, setSubmitting] = useState(false);

  const submit = async ({ images = [], ...fields }) => {
    setSubmitting(true);
    try {
      const { complaint } = await complaintApi.create(fields, images);
      message.success(`Complaint ${complaint.complaintId} submitted`);
      navigate(`/student/complaints/${complaint._id}`, { replace: true });
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors;
      if (fieldErrors) form.setFields(fieldErrors.map((e) => ({ name: e.field, errors: [e.message] })));
      message.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Report an issue"
        description="Describe what's wrong and where. You'll get a complaint ID and can follow every step until it's fixed."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            initialValues={{ priority: 'Medium', images: [] }}
            onFinish={submit}
            scrollToFirstError
          >
            <Form.Item
              name="title"
              label="Title"
              rules={[
                { required: true, message: 'Give the issue a short title' },
                { min: 5, max: 120, message: 'Use 5 to 120 characters' },
              ]}
            >
              <Input placeholder="e.g. Ceiling fan not working in Room 204" showCount maxLength={120} />
            </Form.Item>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Choose a category' }]}>
                <Select placeholder="Choose a category" options={categories.map((c) => ({ value: c, label: c }))} showSearch />
              </Form.Item>
              <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: 'Tell us where the issue is' }]}
              >
                <Input placeholder="Block, floor and room number" maxLength={150} />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label="Description"
              rules={[
                { required: true, message: 'Describe the issue' },
                { min: 10, message: 'Add a little more detail (at least 10 characters)' },
              ]}
            >
              <Input.TextArea
                rows={5}
                showCount
                maxLength={3000}
                placeholder="What is happening, since when, and how it affects you."
              />
            </Form.Item>

            <Form.Item name="priority" label="How urgent is it?">
              <Radio.Group className="w-full">
                <div className="grid gap-2 sm:grid-cols-2">
                  {priorities.map((p) => (
                    <Radio key={p} value={p} className="m-0! rounded-lg border border-line px-3 py-2">
                      <span className="font-semibold" style={{ color: PRIORITY_META[p]?.color }}>
                        {p}
                      </span>
                      <span className="block text-xs text-muted">{PRIORITY_HELP[p]}</span>
                    </Radio>
                  ))}
                </div>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="images"
              label="Photos"
              valuePropName="value"
              extra={`Up to ${MAX_IMAGES} images, ${MAX_IMAGE_MB} MB each (JPG, PNG, WEBP, GIF).`}
            >
              <ImagePicker />
            </Form.Item>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Submit complaint
              </Button>
            </div>
          </Form>
        </Panel>

        <aside className="space-y-4">
          <Panel title="What happens next">
            <ol className="m-0 space-y-3 pl-4 text-sm text-muted">
              <li>The admin office reviews your complaint and may adjust its priority.</li>
              <li>It is assigned to the department and staff member who will fix it.</li>
              <li>You get a notification at every status change, with remarks from the team.</li>
              <li>Once resolved, rate the fix — or reopen it if the problem comes back.</li>
            </ol>
          </Panel>
          <Panel title="Tips for a faster fix">
            <ul className="m-0 space-y-2 pl-4 text-sm text-muted">
              <li>Add the exact room number or a nearby landmark.</li>
              <li>A clear photo saves the team a site visit.</li>
              <li>Report one issue per complaint so each can be tracked.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}
