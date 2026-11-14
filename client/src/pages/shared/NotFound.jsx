import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../utils/constants';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <Result
      status="404"
      title="This page doesn't exist"
      subTitle="Check the address, or head back to your dashboard."
      extra={
        <Button type="primary" onClick={() => navigate(user ? ROLE_HOME[user.role] : '/login')}>
          Go to dashboard
        </Button>
      }
    />
  );
}
