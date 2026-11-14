import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Empty, Popover, Spin } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../utils/constants';
import { fromNow } from '../../utils/format';

const POLL_MS = 45000; // swap for a Socket.IO listener when real-time delivery is added

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await notificationApi.list({ limit: 12 });
      setItems(r.items);
      setUnread(r.unreadCount);
    } catch {
      /* the bell should never break the page */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      notificationApi.markRead(n._id).catch(() => {});
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.complaint?._id) navigate(`${ROLE_HOME[user.role]}/complaints/${n.complaint._id}`);
  };

  const markAll = async () => {
    setLoading(true);
    await notificationApi.markAllRead().catch(() => {});
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    setLoading(false);
  };

  const content = (
    <div className="w-[320px] max-w-[85vw]">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="font-bold text-ink">Notifications</span>
        {unread > 0 && (
          <Button type="link" size="small" onClick={markAll} disabled={loading}>
            Mark all as read
          </Button>
        )}
      </div>
      <Spin spinning={loading}>
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You're all caught up" className="py-4" />
        ) : (
          <ul className="m-0 max-h-[360px] list-none overflow-y-auto p-0">
            {items.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full cursor-pointer gap-2.5 border-0 border-b border-solid border-line px-1 py-2.5 text-left ${
                    n.read ? 'bg-transparent' : 'bg-navy-soft'
                  }`}
                  style={{ font: 'inherit' }}
                >
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: n.read ? 'transparent' : '#1f4e8c' }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-muted">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{fromNow(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Spin>
      <Button
        block
        type="text"
        className="mt-1"
        onClick={() => {
          setOpen(false);
          navigate('/notifications');
        }}
      >
        See all notifications
      </Button>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
      placement="bottomRight"
      arrow={false}
    >
      <Badge count={unread} size="small" offset={[-4, 4]}>
        <Button type="text" shape="circle" icon={<BellOutlined className="text-lg" />} aria-label={`Notifications, ${unread} unread`} />
      </Badge>
    </Popover>
  );
}
