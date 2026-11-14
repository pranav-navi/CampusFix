import { useState } from 'react';
import { Rate, Select, Table } from 'antd';
import { Link } from 'react-router-dom';
import { departmentApi, feedbackApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';

export default function FeedbackPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [filters, setFilters] = useState({ page: 1, limit: 10, rating: '', department: '' });
  const { data, loading } = useAsync(() => feedbackApi.list(filters), [filters]);
  const { data: depts } = useAsync(
    () => (isAdmin ? departmentApi.list() : Promise.resolve({ departments: [] })),
    [isAdmin]
  );
  const base = isAdmin ? '/admin/complaints' : '/staff/complaints';

  const columns = [
    {
      title: 'Complaint',
      key: 'complaint',
      render: (_, f) =>
        f.complaint ? (
          <Link to={`${base}/${f.complaint._id}`} className="text-inherit no-underline">
            <div className="text-xs font-semibold text-navy">{f.complaint.complaintId}</div>
            <div className="font-semibold text-ink">{f.complaint.title}</div>
          </Link>
        ) : (
          '—'
        ),
    },
    { title: 'Rating', dataIndex: 'rating', key: 'rating', width: 170, render: (r) => <Rate disabled value={r} className="text-sm" /> },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (c) => (c ? <span className="text-sm">{c}</span> : <span className="text-muted">No comment</span>),
    },
    isAdmin && {
      title: 'Handled by',
      key: 'by',
      responsive: ['md'],
      render: (_, f) => (
        <div className="text-sm">
          <div>{f.department?.name || '—'}</div>
          <div className="text-xs text-muted">{f.staff?.name}</div>
        </div>
      ),
    },
    { title: 'Student', key: 'student', responsive: ['lg'], render: (_, f) => f.student?.name },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', responsive: ['sm'], render: formatDate },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Feedback' : 'My ratings'}
        description={
          isAdmin
            ? 'How students rated the resolution of their complaints.'
            : 'How students rated the complaints you resolved.'
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Average rating" value={data?.averageRating != null ? `${data.averageRating}/5` : '—'} loading={loading && !data} color="#d97706" />
        <StatCard label="Ratings received" value={data?.pagination?.total} loading={loading && !data} color="#1f4e8c" />
      </div>
      <div className="panel">
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <Select
            allowClear
            placeholder="Any rating"
            className="min-w-[150px]"
            value={filters.rating || undefined}
            onChange={(v) => setFilters((f) => ({ ...f, rating: v || '', page: 1 }))}
            options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` }))}
          />
          {isAdmin && (
            <Select
              allowClear
              placeholder="Department"
              className="min-w-[200px]"
              value={filters.department || undefined}
              onChange={(v) => setFilters((f) => ({ ...f, department: v || '', page: 1 }))}
              options={(depts?.departments || []).map((d) => ({ value: d._id, label: d.name }))}
            />
          )}
        </div>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data?.items || []}
          loading={loading}
          scroll={{ x: 700 }}
          locale={{ emptyText: 'No ratings yet' }}
          onChange={(p) => setFilters((f) => ({ ...f, page: p.current, limit: p.pageSize }))}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.pagination?.total || 0 }}
        />
      </div>
    </>
  );
}
