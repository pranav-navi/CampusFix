import { useState } from 'react';
import { Alert, Button, Segmented, Table } from 'antd';
import { dashboardApi } from '../../api/services';
import useAsync from '../../hooks/useAsync';
import { apiError, formatHours } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Panel from '../../components/common/Panel';
import { ColumnChart, ShareDonut, StackedProgressBars, TrendChart } from '../../components/charts/Charts';

export default function Analytics() {
  const [months, setMonths] = useState(12);
  const { data, loading, error, reload } = useAsync(() => dashboardApi.analytics(months), [months]);

  const deptColumns = [
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v) => <span className="font-semibold">{v}</span> },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', sorter: (a, b) => a.total - b.total },
    { title: 'Open', key: 'open', align: 'right', render: (_, r) => r.pending + r.inProgress },
    { title: 'Resolved', dataIndex: 'resolved', key: 'resolved', align: 'right' },
    {
      title: 'Resolution rate',
      dataIndex: 'resolutionRate',
      key: 'rate',
      align: 'right',
      sorter: (a, b) => a.resolutionRate - b.resolutionRate,
      render: (v) => `${v}%`,
    },
    {
      title: 'Avg. time to resolve',
      dataIndex: 'avgResolutionHours',
      key: 'avg',
      align: 'right',
      sorter: (a, b) => (a.avgResolutionHours ?? 1e9) - (b.avgResolutionHours ?? 1e9),
      render: formatHours,
    },
    {
      title: 'Avg. rating',
      dataIndex: 'avgRating',
      key: 'rating',
      align: 'right',
      sorter: (a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0),
      render: (v) => (v != null ? `${v}/5` : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Live figures from the complaint database. Hover any chart for exact numbers."
        actions={
          <Segmented
            value={months}
            onChange={setMonths}
            options={[
              { label: '3 months', value: 3 },
              { label: '6 months', value: 6 },
              { label: '12 months', value: 12 },
            ]}
          />
        }
      />

      {error && <Alert type="error" showIcon className="mb-5" title={apiError(error)} action={<Button onClick={reload}>Retry</Button>} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={`Monthly trend, last ${months} months`}>
          <TrendChart data={data?.monthlyTrend} height={300} />
        </Panel>
        <Panel title="Resolved vs pending">
          <ShareDonut data={data?.resolvedVsPending} height={240} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Complaints by category">
          <StackedProgressBars data={data?.categoryWise} labelKey="category" withInProgress={false} />
        </Panel>
        <Panel title="Complaints by priority">
          <ColumnChart data={data?.priorityWise} xKey="priority" yKey="count" name="Complaints" height={280} />
        </Panel>
      </div>

      <Panel title="Department performance" className="mt-6">
        <StackedProgressBars data={data?.departmentWise} labelKey="department" />
        <Table
          className="mt-4"
          rowKey="departmentId"
          size="middle"
          loading={loading}
          columns={deptColumns}
          dataSource={data?.departmentWise || []}
          pagination={false}
          scroll={{ x: 720 }}
        />
      </Panel>
    </>
  );
}
