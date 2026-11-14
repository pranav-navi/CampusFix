import PageHeader from '../../components/common/PageHeader';
import ComplaintTable from '../../components/complaints/ComplaintTable';

export default function AssignedComplaints() {
  return (
    <>
      <PageHeader
        title="Assigned to me"
        description="Only complaints assigned to you appear here. Open one to start work, post updates or mark it resolved."
      />
      <ComplaintTable role="staff" basePath="/staff/complaints" emptyText="Nothing assigned to you matches these filters" />
    </>
  );
}
