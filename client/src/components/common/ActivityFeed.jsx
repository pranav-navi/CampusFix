import { Empty } from 'antd';
import { Link } from 'react-router-dom';
import { fromNow } from '../../utils/format';
import { STATUS_META } from '../../utils/constants';

const describe = (h) => {
  switch (h.action) {
    case 'created':
      return 'submitted';
    case 'status_change':
      return `moved to ${h.toStatus}`;
    case 'assigned':
      return h.note?.split('.')[0]?.replace('Assigned to', 'assigned to') || 'assigned';
    case 'priority_change':
      return h.note?.toLowerCase() || 'changed priority';
    case 'remark':
      return 'added a remark to';
    case 'progress_update':
      return 'posted an update on';
    case 'reopened':
      return 'reopened';
    case 'feedback':
      return `rated ${h.meta?.rating ?? ''}/5`;
    default:
      return 'updated';
  }
};

export default function ActivityFeed({ items = [], basePath }) {
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />;
  return (
    <ul className="m-0 list-none p-0">
      {items.map((h) => {
        const color = STATUS_META[h.toStatus]?.color || '#93a3b8';
        return (
          <li key={h._id} className="flex gap-3 border-b border-line py-3 last:border-0">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="leading-snug">
                <strong>{h.performedBy?.name || 'Someone'}</strong> {describe(h)}{' '}
                {h.complaint && (
                  <Link to={`${basePath}/${h.complaint._id}`} className="font-semibold text-navy">
                    {h.complaint.complaintId}
                  </Link>
                )}
              </p>
              {h.complaint?.title && <p className="truncate text-xs text-muted">{h.complaint.title}</p>}
              <p className="mt-0.5 text-xs text-muted">{fromNow(h.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
