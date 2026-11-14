import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ComplaintTable from '../../components/complaints/ComplaintTable';

export default function MyComplaints() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="My complaints"
        description="Every complaint you've submitted, with its current stage. Select one to see the full history."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/student/complaints/new')}>
            Report an issue
          </Button>
        }
      />
      <ComplaintTable role="student" basePath="/student/complaints" emptyText="No complaints here yet" />
    </>
  );
}
