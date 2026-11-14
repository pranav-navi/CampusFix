import { Skeleton } from 'antd';

/**
 * A quiet number tile. The coloured left rule is the status colour the number
 * counts, so the tile and the tags/rail elsewhere read as one system.
 */
export default function StatCard({ label, value, hint, color = '#1f4e8c', icon, loading, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`panel relative flex w-full flex-col justify-start overflow-hidden px-5 py-4 text-left ${
        onClick ? 'cursor-pointer transition-colors hover:border-navy' : ''
      }`}
      style={{ borderLeft: `4px solid ${color}`, font: 'inherit' }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-muted">{label}</span>
        {icon && (
          <span className="text-lg" style={{ color }} aria-hidden>
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton.Input active size="small" className="mt-2" />
      ) : (
        <div className="mt-1 text-3xl font-extrabold text-ink">{value ?? 0}</div>
      )}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Tag>
  );
}
