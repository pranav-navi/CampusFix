import { Alert, Button, Empty } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  StarOutlined,
  SyncOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/services';
import useAsync from '../../hooks/useAsync';
import { STATUS_META } from '../../utils/constants';
import { apiError, formatHours, fromNow } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Panel from '../../components/common/Panel';
import ActivityFeed from '../../components/common/ActivityFeed';
import { PriorityTag, StatusTag } from '../../components/common/Tags';
import StageTrack from '../../components/common/StageTrack';
import { TrendChart } from '../../components/charts/Charts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const stats = useAsync(() => dashboardApi.stats(), []);
  const analytics = useAsync(() => dashboardApi.analytics(6), []);
  const d = stats.data;
  const c = d?.counts;
  const go = (status) => navigate(`/admin/complaints${status ? `?status=${encodeURIComponent(status)}` : ''}`);

  return (
    <>
      <PageHeader
        title="Campus overview"
        description="Everything reported across campus, and what needs your attention first."
        actions={
          <Button type="primary" onClick={() => navigate('/admin/complaints?status=Submitted')}>
            Review new complaints
          </Button>
        }
      />

      {stats.error && (
        <Alert type="error" showIcon className="mb-5" title={apiError(stats.error)} action={<Button onClick={stats.reload}>Retry</Button>} />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total complaints" value={c?.total} loading={stats.loading} icon={<FileTextOutlined />} color="#13294b" onClick={() => go('')} />
        <StatCard
          label="Waiting for review"
          value={c ? c.byStatus.Submitted + c.byStatus['Under Review'] : undefined}
          hint={c ? `${c.byStatus.Reopened} reopened` : undefined}
          loading={stats.loading}
          icon={<ClockCircleOutlined />}
          color={STATUS_META.Submitted.color}
          onClick={() => go('Submitted')}
        />
        <StatCard
          label="With departments"
          value={c ? c.byStatus.Assigned + c.inProgress : undefined}
          hint={c ? `${c.inProgress} in progress` : undefined}
          loading={stats.loading}
          icon={<SyncOutlined />}
          color={STATUS_META['In Progress'].color}
          onClick={() => go('In Progress')}
        />
        <StatCard
          label="Resolved"
          value={c?.resolved}
          hint={d?.avgResolutionHours != null ? `Average ${formatHours(d.avgResolutionHours)} to resolve` : undefined}
          loading={stats.loading}
          icon={<CheckCircleOutlined />}
          color={STATUS_META.Resolved.color}
          onClick={() => go('Resolved')}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={d?.users?.student} loading={stats.loading} icon={<TeamOutlined />} color="#1f4e8c" onClick={() => navigate('/admin/users?role=student')} />
        <StatCard label="Department staff" value={d?.users?.staff} loading={stats.loading} icon={<TeamOutlined />} color="#1f4e8c" onClick={() => navigate('/admin/users?role=staff')} />
        <StatCard label="Active departments" value={d?.departments} loading={stats.loading} color="#1f4e8c" onClick={() => navigate('/admin/departments')} />
        <StatCard
          label="Satisfaction"
          value={d?.rating?.average != null ? `${d.rating.average}/5` : '—'}
          hint={d ? `${d.rating.count} ratings` : undefined}
          loading={stats.loading}
          icon={<StarOutlined />}
          color="#d97706"
          onClick={() => navigate('/admin/feedback')}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Submitted vs resolved, last 6 months" extra={<Link to="/admin/analytics" className="text-sm font-semibold text-navy">Full analytics</Link>}>
          <TrendChart data={analytics.data?.monthlyTrend} height={280} />
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <WarningOutlined style={{ color: '#dc2626' }} /> Urgent and unassigned
            </span>
          }
          bodyClassName="px-5"
        >
          {!stats.loading && !d?.unassignedUrgent?.length ? (
            <Empty className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description="No high-priority complaint is waiting for an owner" />
          ) : (
            <ul className="m-0 list-none p-0">
              {(d?.unassignedUrgent || []).map((r) => (
                <li key={r._id} className="border-b border-line py-3 last:border-0">
                  <Link to={`/admin/complaints/${r._id}`} className="block text-inherit no-underline">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-navy">{r.complaintId}</span>
                      <PriorityTag priority={r.priority} />
                    </div>
                    <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                    <p className="text-xs text-muted">Waiting {fromNow(r.createdAt).replace(' ago', '')}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Recently updated" extra={<Link to="/admin/complaints" className="text-sm font-semibold text-navy">All complaints</Link>} bodyClassName="px-5">
          <ul className="m-0 list-none p-0">
            {(d?.recent || []).map((r) => (
              <li key={r._id} className="border-b border-line py-3 last:border-0">
                <Link to={`/admin/complaints/${r._id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-inherit no-underline">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-navy">{r.complaintId}</span> by {r.student?.name}
                    </p>
                    <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                    <p className="text-xs text-muted">{r.department?.name || 'Not assigned'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusTag status={r.status} />
                    <StageTrack status={r.status} mini />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Latest activity" bodyClassName="px-5 py-1">
          <ActivityFeed items={d?.activity} basePath="/admin/complaints" />
        </Panel>
      </div>
    </>
  );
}
