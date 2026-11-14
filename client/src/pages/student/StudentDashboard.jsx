import { Alert, Button, Empty } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { STATUS_META } from '../../utils/constants';
import { apiError, fromNow } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Panel from '../../components/common/Panel';
import ActivityFeed from '../../components/common/ActivityFeed';
import StageTrack from '../../components/common/StageTrack';
import { PriorityTag, StatusTag } from '../../components/common/Tags';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => dashboardApi.stats(), []);
  const c = data?.counts;
  const list = (status) => navigate(`/student/complaints${status ? `?status=${encodeURIComponent(status)}` : ''}`);

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        description="Here's where your complaints stand today."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/student/complaints/new')}>
            Report an issue
          </Button>
        }
      />

      {error && (
        <Alert type="error" showIcon title={apiError(error)} action={<Button onClick={reload}>Retry</Button>} className="mb-5" />
      )}

      {data?.awaitingFeedback > 0 && (
        <Alert
          type="success"
          showIcon
          className="mb-5"
          title={`${data.awaitingFeedback} resolved complaint${data.awaitingFeedback > 1 ? 's are' : ' is'} waiting for your rating`}
          description="Tell us whether the fix worked — it helps departments improve."
          action={<Button onClick={() => list('Resolved')}>Rate now</Button>}
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total complaints" value={c?.total} loading={loading} icon={<FileTextOutlined />} color="#13294b" onClick={() => list('')} />
        <StatCard
          label="Pending"
          value={c?.pending}
          hint="Submitted, in review, assigned or reopened"
          loading={loading}
          icon={<ClockCircleOutlined />}
          color={STATUS_META.Submitted.color}
          onClick={() => list('')}
        />
        <StatCard label="In progress" value={c?.inProgress} loading={loading} icon={<SyncOutlined />} color={STATUS_META['In Progress'].color} onClick={() => list('In Progress')} />
        <StatCard label="Resolved" value={c?.resolved} loading={loading} icon={<CheckCircleOutlined />} color={STATUS_META.Resolved.color} onClick={() => list('Resolved')} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Your recent complaints"
          extra={<Link to="/student/complaints" className="text-sm font-semibold text-navy">View all</Link>}
          bodyClassName="px-5"
        >
          {!loading && !data?.recent?.length ? (
            <Empty
              className="py-10"
              description="You haven't reported anything yet."
            >
              <Button type="primary" onClick={() => navigate('/student/complaints/new')}>
                Report your first issue
              </Button>
            </Empty>
          ) : (
            <ul className="m-0 list-none p-0">
              {(data?.recent || []).map((r) => (
                <li key={r._id} className="border-b border-line py-4 last:border-0">
                  <Link to={`/student/complaints/${r._id}`} className="block text-inherit no-underline">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-navy">{r.complaintId}</span>
                        <p className="truncate font-semibold text-ink">{r.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityTag priority={r.priority} />
                        <StatusTag status={r.status} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <StageTrack status={r.status} mini />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {r.department ? `With ${r.department.name}` : 'Not yet assigned to a department'}, updated {fromNow(r.updatedAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity" bodyClassName="px-5 py-1">
          <ActivityFeed items={data?.activity} basePath="/student/complaints" />
        </Panel>
      </div>
    </>
  );
}
