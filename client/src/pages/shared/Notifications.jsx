import { App, Button, Empty, Segmented, Skeleton } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { ROLE_HOME } from '../../utils/constants';
import { formatDateTime, fromNow } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';

export default function Notifications() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const { data, loading, reload } = useAsync(
    () => notificationApi.list({ limit: 50, unread: filter === 'unread' ? 'true' : '' }),
    [filter]
  );

  const open = async (n) => {
    if (!n.read) await notificationApi.markRead(n._id).catch(() => {});
    if (n.complaint?._id) navigate(`${ROLE_HOME[user.role]}/complaints/${n.complaint._id}`);
    else reload();
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    message.success('All notifications marked as read');
    reload();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Status changes, assignments, remarks and ratings on complaints that involve you."
        actions={
          <>
            <Segmented value={filter} onChange={setFilter} options={[{ label: 'All', value: 'all' }, { label: 'Unread', value: 'unread' }]} />
            <Button onClick={markAll} disabled={!data?.unreadCount}>
              Mark all as read
            </Button>
          </>
        }
      />
      <div className="panel">
        {loading && !data ? (
          <div className="p-6">
            <Skeleton active />
          </div>
        ) : !data?.items?.length ? (
          <Empty className="py-14" description={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} />
        ) : (
          <ul className="m-0 list-none p-0">
            {data.items.map((n) => (
              <li key={n._id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={`flex w-full cursor-pointer items-start gap-3 border-0 px-5 py-4 text-left ${n.read ? 'bg-white' : 'bg-navy-soft'}`}
                  style={{ font: 'inherit' }}
                >
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: n.read ? '#cbd5e1' : '#1f4e8c' }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold text-ink">{n.title}</span>
                      <span className="text-xs text-muted" title={formatDateTime(n.createdAt)}>
                        {fromNow(n.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-body">{n.message}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
