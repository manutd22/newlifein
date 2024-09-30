import React, { useEffect, useState } from 'react';
import { List, Cell } from '@telegram-apps/telegram-ui';
import { NavigationBar } from '@/components/NavigationBar/NavigationBar';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardUser {
  id: number;
  username: string;
  balance: number;
}

export const LeaderboardPage: React.FC = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('id, username, balance')
          .order('balance', { ascending: false })
          .limit(50);

        if (error) throw error;

        setUsers(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Не удалось загрузить таблицу лидеров. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <h1>Leaderboard</h1>
      {isLoading ? (
        <div>Загрузка таблицы лидеров...</div>
      ) : error ? (
        <div>{error}</div>
      ) : (
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
      )}
      <NavigationBar />
    </div>
  );
};