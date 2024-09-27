import React, { useEffect, useState } from 'react';
import { List, Cell } from '@telegram-apps/telegram-ui';
import axios from 'axios';
import { NavigationBar } from '@/components/NavigationBar/NavigationBar';

interface LeaderboardUser {
  id: number;
  username: string;
  balance: number;
}

const BACKEND_URL = 'https://cac7ae287eb1fdd71fd2406a456ae2c0.serveo.net';

export const LeaderboardPage: React.FC = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/leaderboard`);
        setUsers(response.data.slice(0, 50)); // Ограничиваем до 50 пользователей
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <h1>Leaderboard</h1>
      <List>
        {users.map((user, index) => (
          <Cell
            key={user.id}
            before={`#${index + 1}`}
            after={`${user.balance} BallCry`}
          >
            {user.username}
          </Cell>
        ))}
      </List>
      <NavigationBar />
    </div>
  );
};