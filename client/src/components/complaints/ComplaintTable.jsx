import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select, Table, Tooltip } from 'antd';
import { ReloadOutlined, SearchOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { complaintApi, departmentApi } from '../../api/services';
import { useMeta } from '../../context/MetaContext';
import useAsync from '../../hooks/useAsync';
import { formatDate, fromNow } from '../../utils/format';
import { PriorityTag, StatusTag } from '../common/Tags';
import StageTrack from '../common/StageTrack';

const FILTER_KEYS = ['search', 'status', 'priority', 'category', 'department', 'from', 'to'];

/**
 * Server-side table: search, filters, sorting and pagination are all sent to
 * GET /api/complaints and mirrored in the URL (so dashboard tiles can deep-link
 * e.g. ?status=In%20Progress and the browser back button keeps your place).
 */
export default function ComplaintTable({ role, basePath, emptyText = 'No complaints match these filters' }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { statuses, priorities, categories } = useMeta();
  const [searchDraft, setSearchDraft] = useState(params.get('search') || '');

  const query = useMemo(() => {
    const q = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
    q.page = Number(params.get('page')) || 1;
    q.limit = Number(params.get('limit')) || 10;
    q.sortBy = params.get('sortBy') || 'createdAt';
    q.order = params.get('order') || 'desc';
    return q;
  }, [params]);

  const { data, loading, error, reload } = useAsync(() => complaintApi.list(query), [query]);
  const { data: deptData } = useAsync(
    () => (role === 'admin' ? departmentApi.list() : Promise.resolve({ departments: [] })),
    [role]
  );

  // Debounce the search box -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('search') || '') !== searchDraft) update({ search: searchDraft, page: 1 });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  function update(patch) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace: true });
  }

  const hasFilters = FILTER_KEYS.some((k) => params.get(k));

  const sortOrderFor = (key) =>
    query.sortBy === key ? (query.order === 'asc' ? 'ascend' : 'descend') : null;

  const columns = [
    {
      title: 'Complaint',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      sortOrder: sortOrderFor('title'),
      render: (title, r) => (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-navy">{r.complaintId}</span>
            <span>{r.category}</span>
            {r.attachments?.length > 0 && (
              <Tooltip title={`${r.attachments.length} photo(s)`}>
                <PaperClipOutlined />
              </Tooltip>
            )}
          </div>
          <div className="font-semibold text-ink">{title}</div>
          <div className="text-xs text-muted">{r.location}</div>
          <div className="mt-1.5 sm:hidden">
            <StatusTag status={r.status} />
          </div>
        </div>
      ),
    },
    role !== 'student' && {
      title: 'Reported by',
      key: 'student',
      responsive: ['lg'],
      render: (_, r) => (
        <div className="text-sm">
          <div className="font-medium">{r.student?.name || '—'}</div>
          <div className="text-xs text-muted">{r.student?.studentId}</div>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      sorter: true,
      sortOrder: sortOrderFor('priority'),
      width: 110,
      render: (p) => <PriorityTag priority={p} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      sortOrder: sortOrderFor('status'),
      width: 170,
      render: (s) => (
        <div className="flex flex-col gap-1.5">
          <StatusTag status={s} />
          <StageTrack status={s} mini />
        </div>
      ),
    },
    role !== 'staff' && {
      title: 'Department',
      key: 'department',
      responsive: ['md'],
      render: (_, r) =>
        r.department ? (
          <div className="text-sm">
            <div className="font-medium">{r.department.name}</div>
            <div className="text-xs text-muted">{r.assignedTo?.name || 'No staff assigned yet'}</div>
          </div>
        ) : (
          <span className="text-xs text-muted">Not assigned</span>
        ),
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      sortOrder: sortOrderFor('createdAt'),
      width: 130,
      responsive: ['sm'],
      render: (d) => (
        <Tooltip title={formatDate(d)}>
          <span className="text-sm text-muted">{fromNow(d)}</span>
        </Tooltip>
      ),
    },
  ].filter(Boolean);

  const onTableChange = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    update({
      page: pagination.current,
      limit: pagination.pageSize,
      sortBy: s?.order ? s.columnKey : '',
      order: s?.order ? (s.order === 'ascend' ? 'asc' : 'desc') : '',
    });
  };

  const selectProps = (key, placeholder, options) => ({
    allowClear: true,
    placeholder,
    value: params.get(key) || undefined,
    onChange: (v) => update({ [key]: v, page: 1 }),
    options: options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    className: 'min-w-[150px]',
  });

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <Input
          allowClear
          prefix={<SearchOutlined className="text-muted" />}
          placeholder="Search by ID, title or location"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="w-full sm:w-[280px]"
        />
        <Select {...selectProps('status', 'Status', statuses)} />
        <Select {...selectProps('priority', 'Priority', priorities)} />
        <Select {...selectProps('category', 'Category', categories)} />
        {role === 'admin' && (
          <Select
            {...selectProps(
              'department',
              'Department',
              (deptData?.departments || []).map((d) => ({ value: d._id, label: d.name }))
            )}
            className="min-w-[190px]"
          />
        )}
        <DatePicker.RangePicker
          value={params.get('from') ? [dayjs(params.get('from')), dayjs(params.get('to'))] : null}
          onChange={(r) =>
            update({
              from: r ? r[0].startOf('day').toISOString() : '',
              to: r ? r[1].endOf('day').toISOString() : '',
              page: 1,
            })
          }
          allowEmpty={[false, false]}
          className="w-full sm:w-auto"
        />
        <div className="ml-auto flex gap-2">
          {hasFilters && (
            <Button
              onClick={() => {
                setSearchDraft('');
                update(Object.fromEntries([...FILTER_KEYS, 'page'].map((k) => [k, ''])));
              }}
            >
              Clear filters
            </Button>
          )}
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={reload} aria-label="Refresh list" />
          </Tooltip>
        </div>
      </div>

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data?.items || []}
        loading={loading}
        onChange={onTableChange}
        locale={{ emptyText: error ? 'Could not load complaints. Check that the API is running.' : emptyText }}
        onRow={(r) => ({
          onClick: () => navigate(`${basePath}/${r._id}`),
          onKeyDown: (e) => e.key === 'Enter' && navigate(`${basePath}/${r._id}`),
          tabIndex: 0,
          className: 'cursor-pointer',
        })}
        pagination={{
          current: query.page,
          pageSize: query.limit,
          total: data?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (t, [a, b]) => `${a}–${b} of ${t}`,
        }}
        scroll={{ x: 760 }}
      />
    </div>
  );
}
