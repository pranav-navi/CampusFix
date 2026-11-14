import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Empty } from 'antd';

/*
 * Chart palette — validated for colour-vision deficiency with the dataviz
 * validator (light surface). Colour follows the entity, never its rank.
 *   two-series trend:  submitted #2a5ea8, resolved #1a7f4b  (all checks pass)
 *   lifecycle stack:   pending #7c5cc4, in progress #d97706, resolved #1a7f4b
 *                      (protan ΔE 7.8 → always shipped with 2px gaps + legend + tooltip)
 */
export const SERIES = {
  submitted: '#2a5ea8',
  resolved: '#1a7f4b',
  pending: '#7c5cc4',
  inProgress: '#d97706',
  single: '#2a5ea8',
};

const AXIS = { stroke: '#94a3b8', fontSize: 12, tickLine: false, axisLine: false };
const GRID = <CartesianGrid stroke="#e2e7ef" strokeDasharray="0" vertical={false} />;

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-bold text-ink">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-body">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} aria-hidden />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const legendFormatter = (value) => <span className="text-xs text-body">{value}</span>;

const isEmpty = (data, keys) => !data?.length || data.every((d) => keys.every((k) => !d[k]));

function NoData() {
  return (
    <div className="flex h-full items-center justify-center">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No complaints in this view yet" />
    </div>
  );
}

/** Monthly trend: complaints submitted vs resolved per month (one y-axis, two lines) */
export function TrendChart({ data, height = 300 }) {
  if (isEmpty(data, ['submitted', 'resolved'])) return <div style={{ height }}><NoData /></div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="label" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
        <Legend iconType="plainline" formatter={legendFormatter} itemSorter={null} />
        <Line type="monotone" dataKey="submitted" name="Submitted" stroke={SERIES.submitted} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
        <Line type="monotone" dataKey="resolved" name="Resolved" stroke={SERIES.resolved} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Horizontal stacked bar: pending / in progress / resolved per row.
 * Used for categories and departments. White strokes give the 2px gap.
 */
export function StackedProgressBars({ data, labelKey, height, withInProgress = true }) {
  if (isEmpty(data, ['total'])) return <div style={{ height: height || 280 }}><NoData /></div>;
  const h = height || Math.max(220, data.length * 38 + 60);
  const seg = { stroke: '#ffffff', strokeWidth: 2 };
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid stroke="#e2e7ef" horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...AXIS} />
        <YAxis type="category" dataKey={labelKey} width={150} {...AXIS} tick={{ fill: '#1b2433', fontSize: 12 }} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f7fc' }} />
        <Legend formatter={legendFormatter} iconType="square" itemSorter={null} />
        <Bar dataKey="pending" name="Pending" stackId="s" fill={SERIES.pending} {...seg} />
        {withInProgress && <Bar dataKey="inProgress" name="In progress" stackId="s" fill={SERIES.inProgress} {...seg} />}
        <Bar dataKey="resolved" name="Resolved" stackId="s" fill={SERIES.resolved} radius={[0, 4, 4, 0]} {...seg} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series column chart (e.g. complaints by priority) */
export function ColumnChart({ data, xKey, yKey, name, height = 260 }) {
  if (isEmpty(data, [yKey])) return <div style={{ height }}><NoData /></div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
        {GRID}
        <XAxis dataKey={xKey} {...AXIS} tick={{ fill: '#1b2433', fontSize: 12 }} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f7fc' }} />
        <Bar dataKey={yKey} name={name} fill={SERIES.single} radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Resolved vs pending share — a donut with the total in the middle and a labelled legend */
export function ShareDonut({ data, height = 260 }) {
  const total = data?.reduce((s, d) => s + d.value, 0) || 0;
  if (!total) return <div style={{ height }}><NoData /></div>;
  const colors = { Resolved: SERIES.resolved, 'In Progress': SERIES.inProgress, Pending: SERIES.pending };
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full sm:w-1/2" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip labelFormatter={(_, p) => p?.[0]?.name} />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" startAngle={90} endAngle={-270} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={colors[d.name]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-ink">{total}</span>
          <span className="text-xs text-muted">complaints</span>
        </div>
      </div>
      <ul className="m-0 w-full list-none space-y-3 p-0 sm:w-1/2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ background: colors[d.name] }} aria-hidden />
            <span className="text-body">{d.name}</span>
            <span className="ml-auto font-bold text-ink">{d.value}</span>
            <span className="w-12 text-right text-muted">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
