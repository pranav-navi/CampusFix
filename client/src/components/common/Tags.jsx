import { PRIORITY_META, STATUS_META } from '../../utils/constants';

const pill = (color, bg) => ({
  color,
  background: bg,
  border: `1px solid ${color}33`,
});

export function StatusTag({ status }) {
  const m = STATUS_META[status] || STATUS_META.Submitted;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={pill(m.color, m.bg)}
      title={m.hint}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} aria-hidden />
      {status}
    </span>
  );
}

export function PriorityTag({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.Medium;
  return (
    <span className="inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold" style={pill(m.color, m.bg)}>
      {priority}
    </span>
  );
}
