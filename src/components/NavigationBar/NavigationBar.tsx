import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiOutlineHome, AiOutlineTrophy, AiOutlineUser } from 'react-icons/ai';

export const NavigationBar: FC = () => {
  const location = useLocation();

  const getLinkStyle = (path: string) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    color: location.pathname === path ? '#007AFF' : 'inherit',
  });

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px',
      background: '#f0f0f0',
      borderTop: '1px solid #ccc'
    }}>
      <Link to="/" style={getLinkStyle('/')}>
        <AiOutlineHome size={24} />
        <span>Home</span>
      </Link>
      <Link to="/leaderboard" style={getLinkStyle('/leaderboard')}>
        <AiOutlineTrophy size={24} />
        <span>Leaderboard</span>
      </Link>
      <Link to="/friends" style={getLinkStyle('/friends')}>
        <AiOutlineUser size={24} />
        <span>Friends</span>
      </Link>
    </div>
  );
};