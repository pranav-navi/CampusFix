import PageHeader from '../../components/common/PageHeader';
import ComplaintTable from '../../components/complaints/ComplaintTable';

export default function AllComplaints() {
  return (
    <>
      <PageHeader
        title="All complaints"
        description="Search, filter and sort every complaint on campus. Open one to assign it, change its status or add a remark."
      />
      <ComplaintTable role="admin" basePath="/admin/complaints" />
    </>
  );
}
