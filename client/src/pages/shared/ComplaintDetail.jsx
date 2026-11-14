import { useState } from 'react';
import { Alert, App, Button, Descriptions, Dropdown, Empty, Image, Rate, Result, Skeleton, Timeline } from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  RedoOutlined,
  StarOutlined,
  TeamOutlined,
  FlagOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { complaintApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { ROLE_HOME, ROLE_LABEL, STATUS_META } from '../../utils/constants';
import { apiError, fileUrl, formatDateTime, fromNow } from '../../utils/format';
import Panel from '../../components/common/Panel';
import StageTrack from '../../components/common/StageTrack';
import { PriorityTag, StatusTag } from '../../components/common/Tags';
import {
  AssignModal,
  EditModal,
  FeedbackModal,
  PriorityModal,
  ProgressModal,
  RemarkModal,
  ReopenModal,
  StatusModal,
} from '../../components/complaints/ActionModals';

const HISTORY_LABEL = {
  created: 'Complaint submitted',
  updated: 'Details edited',
  status_change: 'Status changed',
  assigned: 'Assigned',
  priority_change: 'Priority changed',
  remark: 'Admin remark',
  progress_update: 'Progress update',
  reopened: 'Reopened',
  feedback: 'Feedback',
};

function Gallery({ files = [], empty }) {
  if (!files.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <Image.PreviewGroup>
      <div className="flex flex-wrap gap-3">
        {files.map((f) => (
          <Image
            key={f._id || f.url}
            src={fileUrl(f.url)}
            alt={f.originalName || 'Attachment'}
            width={112}
            height={112}
            className="rounded-lg object-cover"
            style={{ objectFit: 'cover', borderRadius: 8 }}
          />
        ))}
      </div>
    </Image.PreviewGroup>
  );
}

/** Admin remarks + staff updates merged into one dated conversation */
function Thread({ complaint }) {
  const notes = [
    ...(complaint.adminRemarks || []).map((n) => ({ ...n, kind: 'admin' })),
    ...(complaint.staffUpdates || []).map((n) => ({ ...n, kind: 'staff' })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!notes.length) return <p className="text-sm text-muted">No remarks or updates yet.</p>;
  return (
    <ul className="m-0 list-none space-y-4 p-0">
      {notes.map((n) => (
        <li key={n._id} className="flex gap-3">
          <span
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: n.kind === 'admin' ? '#13294b' : '#d97706' }}
            aria-hidden
          >
            {n.kind === 'admin' ? 'A' : 'S'}
          </span>
          <div className="min-w-0 flex-1 rounded-lg bg-canvas px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-ink">
                {n.author?.name || 'Team'}{' '}
                <span className="font-medium text-muted">
                  {n.kind === 'admin' ? 'Administration' : 'Department staff'}
                </span>
              </span>
              <span className="text-xs text-muted">{formatDateTime(n.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{n.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { data, loading, error, setData } = useAsync(() => complaintApi.get(id), [id]);
  const [open, setOpen] = useState(null); // which modal is open

  const listPath = `${ROLE_HOME[user.role]}/complaints`;
  const close = () => setOpen(null);
  const onDone = (res) => {
    if (res?.complaint && res?.history) setData({ complaint: res.complaint, history: res.history, permissions: res.permissions });
  };

  if (loading && !data) {
    return (
      <div className="panel p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }
  if (error) {
    const status = error?.response?.status;
    return (
      <Result
        status={status === 404 ? '404' : 'error'}
        title={status === 404 ? 'Complaint not found' : 'Could not load this complaint'}
        subTitle={status === 404 ? "It may have been deleted, or it isn't visible to your account." : apiError(error)}
        extra={<Button onClick={() => navigate(listPath)}>Back to complaints</Button>}
      />
    );
  }

  const { complaint: c, history, permissions: p } = data;
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const isStudent = user.role === 'student';

  const confirmDelete = () =>
    modal.confirm({
      title: `Delete ${c.complaintId}?`,
      content: 'The complaint, its photos and its history will be removed permanently.',
      okText: 'Delete complaint',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await complaintApi.remove(c._id);
          message.success('Complaint deleted');
          navigate(listPath, { replace: true });
        } catch (err) {
          message.error(apiError(err));
        }
      },
    });

  /* ----- role-specific primary actions ----- */
  const primary = [];
  const secondary = [];

  if (isAdmin) {
    if (c.status !== 'Resolved')
      primary.push(
        <Button key="assign" type="primary" icon={<TeamOutlined />} onClick={() => setOpen('assign')}>
          {c.department ? 'Reassign' : 'Assign'}
        </Button>
      );
    if (p.nextStatuses.length)
      primary.push(
        <Button key="status" icon={<SwapOutlined />} onClick={() => setOpen('status')}>
          Change status
        </Button>
      );
    primary.push(
      <Button key="remark" icon={<MessageOutlined />} onClick={() => setOpen('remark')}>
        Add remark
      </Button>
    );
    secondary.push({ key: 'priority', icon: <FlagOutlined />, label: 'Change priority' });
    secondary.push({ key: 'delete', icon: <DeleteOutlined />, label: 'Delete complaint', danger: true });
  }

  if (isStaff) {
    if (p.nextStatuses.includes('In Progress'))
      primary.push(
        <Button key="start" type="primary" icon={<PlayCircleOutlined />} onClick={() => setOpen('status')}>
          Start work
        </Button>
      );
    if (c.status === 'In Progress')
      primary.push(
        <Button key="resolve" type="primary" icon={<CheckCircleOutlined />} onClick={() => setOpen('resolve')}>
          Mark as resolved
        </Button>
      );
    if (p.canAddUpdate)
      primary.push(
        <Button key="update" icon={<MessageOutlined />} onClick={() => setOpen('progress')}>
          Post update
        </Button>
      );
  }

  if (isStudent) {
    if (p.canGiveFeedback)
      primary.push(
        <Button key="rate" type="primary" icon={<StarOutlined />} onClick={() => setOpen('feedback')}>
          Rate the fix
        </Button>
      );
    if (p.canReopen)
      primary.push(
        <Button key="reopen" danger icon={<RedoOutlined />} onClick={() => setOpen('reopen')}>
          Reopen
        </Button>
      );
    if (p.canEdit)
      primary.push(
        <Button key="edit" icon={<EditOutlined />} onClick={() => setOpen('edit')}>
          Edit
        </Button>
      );
    if (p.canDelete) secondary.push({ key: 'delete', icon: <DeleteOutlined />, label: 'Delete complaint', danger: true });
  }

  const onSecondary = ({ key }) => (key === 'delete' ? confirmDelete() : setOpen(key));

  const timelineItems = history.map((h) => ({
    key: h._id,
    color: STATUS_META[h.toStatus]?.color || (h.action === 'feedback' ? '#d97706' : '#93a3b8'),
    content: (
      <div className="pb-1 text-sm">
        <p className="font-bold text-ink">
          {h.action === 'status_change' && h.toStatus ? h.toStatus : HISTORY_LABEL[h.action]}
        </p>
        {h.note && h.action !== 'created' && <p className="mt-0.5 whitespace-pre-wrap text-body">{h.note}</p>}
        <p className="mt-0.5 text-xs text-muted">
          {h.performedBy?.name || 'System'} ({ROLE_LABEL[h.role]}), {formatDateTime(h.createdAt)}
        </p>
      </div>
    ),
  }));

  return (
    <>
      <Link to={listPath} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted no-underline hover:text-navy">
        <ArrowLeftOutlined /> Back to complaints
      </Link>

      {/* Header + lifecycle track */}
      <section className="panel mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-navy">{c.complaintId}</span>
              <StatusTag status={c.status} />
              <PriorityTag priority={c.priority} />
              {c.reopenCount > 0 && <span className="text-xs text-muted">Reopened {c.reopenCount}×</span>}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-[26px]">{c.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {c.category} issue at {c.location}, reported {fromNow(c.createdAt)}
            </p>
          </div>
          {(primary.length > 0 || secondary.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {primary}
              {secondary.length > 0 && (
                <Dropdown menu={{ items: secondary, onClick: onSecondary }} trigger={['click']}>
                  <Button icon={<MoreOutlined />} aria-label="More actions" />
                </Dropdown>
              )}
            </div>
          )}
        </div>
        <div className="mt-6">
          <StageTrack status={c.status} />
        </div>
      </section>

      {isStudent && p.canGiveFeedback && (
        <Alert
          className="mb-6"
          type="success"
          showIcon
          title="This complaint has been resolved"
          description="Did the fix work? Rate it — or reopen the complaint if the problem is still there."
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Details">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{c.description}</p>
            <Descriptions
              className="mt-5"
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                { key: 'cat', label: 'Category', children: c.category },
                { key: 'loc', label: 'Location', children: c.location },
                { key: 'sub', label: 'Submitted', children: formatDateTime(c.createdAt) },
                { key: 'upd', label: 'Last updated', children: formatDateTime(c.updatedAt) },
                ...(c.resolvedAt
                  ? [
                      { key: 'res', label: 'Resolved', children: formatDateTime(c.resolvedAt) },
                      { key: 'time', label: 'Time to resolve', children: c.resolutionHours != null ? `${c.resolutionHours} hours` : '—' },
                    ]
                  : []),
                ...(!isStudent
                  ? [
                      {
                        key: 'by',
                        label: 'Reported by',
                        children: `${c.student?.name} (${c.student?.studentId || 'no roll no.'})`,
                      },
                      { key: 'contact', label: 'Student contact', children: c.student?.phone || c.student?.email },
                    ]
                  : []),
              ]}
            />
          </Panel>

          <Panel title={`Photos from the student (${c.attachments?.length || 0})`}>
            <Gallery files={c.attachments} empty="No photos were attached." />
          </Panel>

          <Panel title="Remarks and updates">
            <Thread complaint={c} />
          </Panel>

          {(c.resolutionImages?.length > 0 || c.status === 'Resolved') && (
            <Panel title="Resolution photos">
              <Gallery files={c.resolutionImages} empty="The team didn't upload photos of the fix." />
            </Panel>
          )}

          {c.feedback && (
            <Panel title="Student feedback">
              <div className="flex items-center gap-3">
                <Rate disabled value={c.feedback.rating} />
                <span className="text-sm font-semibold">{c.feedback.rating}/5</span>
              </div>
              {c.feedback.comment && <p className="mt-2 text-sm">“{c.feedback.comment}”</p>}
              <p className="mt-1 text-xs text-muted">{formatDateTime(c.feedback.createdAt)}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Assigned to">
            {c.department ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-bold text-ink">{c.department.name}</p>
                  {c.department.contactEmail && <p className="text-muted">{c.department.contactEmail}</p>}
                </div>
                <div className="border-t border-line pt-3">
                  {c.assignedTo ? (
                    <>
                      <p className="font-semibold">{c.assignedTo.name}</p>
                      <p className="text-muted">{c.assignedTo.designation || 'Department staff'}</p>
                      {!isStudent && c.assignedTo.phone && <p className="text-muted">{c.assignedTo.phone}</p>}
                    </>
                  ) : (
                    <p className="text-muted">No staff member picked yet.</p>
                  )}
                  {c.assignedAt && <p className="mt-1 text-xs text-muted">Since {formatDateTime(c.assignedAt)}</p>}
                </div>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={isAdmin ? 'Not assigned yet' : 'Waiting for the admin office to assign a department'}
              >
                {isAdmin && (
                  <Button type="primary" onClick={() => setOpen('assign')}>
                    Assign now
                  </Button>
                )}
              </Empty>
            )}
          </Panel>

          <Panel title="History">
            <Timeline items={timelineItems} />
          </Panel>
        </div>
      </div>

      {/* Modals (rendered only for roles that can use them) */}
      {isAdmin && (
        <>
          <AssignModal open={open === 'assign'} onClose={close} complaint={c} onDone={onDone} />
          <StatusModal open={open === 'status'} onClose={close} complaint={c} nextStatuses={p.nextStatuses} onDone={onDone} />
          <RemarkModal open={open === 'remark'} onClose={close} complaint={c} onDone={onDone} />
          <PriorityModal open={open === 'priority'} onClose={close} complaint={c} onDone={onDone} />
        </>
      )}
      {isStaff && (
        <>
          <StatusModal open={open === 'status'} onClose={close} complaint={c} nextStatuses={['In Progress']} onDone={onDone} />
          <ProgressModal open={open === 'progress'} onClose={close} complaint={c} onDone={onDone} />
          <ProgressModal open={open === 'resolve'} onClose={close} complaint={c} resolve onDone={onDone} />
        </>
      )}
      {isStudent && (
        <>
          <EditModal open={open === 'edit'} onClose={close} complaint={c} onDone={onDone} />
          <ReopenModal open={open === 'reopen'} onClose={close} complaint={c} onDone={onDone} />
          <FeedbackModal open={open === 'feedback'} onClose={close} complaint={c} onDone={onDone} />
        </>
      )}
    </>
  );
}
