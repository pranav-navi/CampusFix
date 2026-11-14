import { Alert, Button, Empty } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FireOutlined, SyncOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { STATUS_META } from '../../utils/constants';
import { apiError, formatHours, fromNow } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Panel from '../../components/common/Panel';
import ActivityFeed from '../../components/common/ActivityFeed';
import StageTrack from '../../components/common/StageTrack';
import { PriorityTag, StatusTag } from '../../components/common/Tags';

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => dashboardApi.stats(), []);
  const c = data?.counts;
  const go = (status) => navigate(`/staff/complaints${status ? `?status=${encodeURIComponent(status)}` : ''}`);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.name.split(' ')[0]}`}
        description={`Complaints assigned to you in ${user.department?.name || 'your department'}.`}
        actions={<Button type="primary" onClick={() => go('')}>Open my queue</Button>}
      />

      {error && <Alert type="error" showIcon className="mb-5" title={apiError(error)} action={<Button onClick={reload}>Retry</Button>} />}

      {data?.urgentOpen > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<FireOutlined />}
          className="mb-5"
          title={`${data.urgentOpen} high or urgent complaint${data.urgentOpen > 1 ? 's need' : ' needs'} your attention`}
          action={<Button onClick={() => navigate('/staff/complaints?priority=Urgent')}>View urgent</Button>}
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assigned to me" value={c?.total} loading={loading} color="#13294b" onClick={() => go('')} />
        <StatCard
          label="Not started"
          value={c?.pending}
          hint={c ? `${c.byStatus.Reopened} reopened` : undefined}
          loading={loading}
          icon={<ClockCircleOutlined />}
          color={STATUS_META.Assigned.color}
          onClick={() => go('Assigned')}
        />
        <StatCard label="In progress" value={c?.inProgress} loading={loading} icon={<SyncOutlined />} color={STATUS_META['In Progress'].color} onClick={() => go('In Progress')} />
        <StatCard
          label="Resolved"
          value={c?.resolved}
          hint={data ? `${data.resolvedThisMonth} this month, avg ${formatHours(data.avgResolutionHours)}` : undefined}
          loading={loading}
          icon={<CheckCircleOutlined />}
          color={STATUS_META.Resolved.color}
          onClick={() => go('Resolved')}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Your recent jobs" extra={<Link to="/staff/complaints" className="text-sm font-semibold text-navy">View all</Link>} bodyClassName="px-5">
          {!loading && !data?.recent?.length ? (
            <Empty className="py-10" description="Nothing has been assigned to you yet." />
          ) : (
            <ul className="m-0 list-none p-0">
              {(data?.recent || []).map((r) => (
                <li key={r._id} className="border-b border-line py-4 last:border-0">
                  <Link to={`/staff/complaints/${r._id}`} className="block text-inherit no-underline">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-navy">{r.complaintId}</span>
                        <p className="truncate font-semibold text-ink">{r.title}</p>
                        <p className="text-xs text-muted">
                          {r.location}, updated {fromNow(r.updatedAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex gap-2">
                          <PriorityTag priority={r.priority} />
                          <StatusTag status={r.status} />
                        </div>
                        <StageTrack status={r.status} mini />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Your rating">
            {data?.rating?.count ? (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold text-ink">{data.rating.average}</span>
                <span className="pb-1 text-sm text-muted">/ 5 from {data.rating.count} student ratings</span>
              </div>
            ) : (
              <p className="text-sm text-muted">Ratings appear here once students rate your resolved complaints.</p>
            )}
          </Panel>
          <Panel title="Recent activity" bodyClassName="px-5 py-1">
            <ActivityFeed items={data?.activity} basePath="/staff/complaints" />
          </Panel>
        </div>
      </div>
    </>
  );
}
