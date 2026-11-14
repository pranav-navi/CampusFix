import { Tooltip } from 'antd';
import { STAGES, STATUS_META } from '../../utils/constants';

/**
 * The lifecycle rail: five segments (Submitted → Resolved) filled up to the
 * current stage in that stage's colour. "Reopened" paints the whole rail red
 * up to Assigned, because the complaint is back in the department's queue.
 *
 *   full  — labelled version for the complaint page
 *   mini  — 5 tiny segments for table rows
 */
export default function StageTrack({ status, mini = false }) {
  const reopened = status === 'Reopened';
  const reached = reopened ? STAGES.indexOf('Assigned') : STAGES.indexOf(status);
  const color = STATUS_META[status]?.color || '#64748b';

  const segments = STAGES.map((stage, i) => (
    <div
      key={stage}
      className="stage-track__seg"
      style={{ background: i <= reached ? color : undefined, opacity: i <= reached && i < reached ? 0.55 : 1 }}
    />
  ));

  if (mini) {
    return (
      <Tooltip title={`${status} — ${STATUS_META[status]?.hint || ''}`}>
        <div className="stage-track stage-track--mini" role="img" aria-label={`Stage: ${status}`}>
          {segments}
        </div>
      </Tooltip>
    );
  }

  return (
    <div role="img" aria-label={`Current stage: ${status}`}>
      <div className="stage-track">{segments}</div>
      <div className="mt-2 grid grid-cols-5 gap-1.5 text-[11px] sm:text-xs">
        {STAGES.map((stage, i) => (
          <span
            key={stage}
            className={i === reached ? 'font-bold' : 'text-muted'}
            style={i === reached ? { color } : undefined}
          >
            {stage}
          </span>
        ))}
      </div>
      {reopened && (
        <p className="mt-2 text-xs font-semibold" style={{ color }}>
          Reopened by the student — the department is working on it again.
        </p>
      )}
    </div>
  );
}
