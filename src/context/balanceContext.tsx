import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLaunchParams } from '@telegram-apps/sdk-react';

const BACKEND_URL = 'https://63091712ee14ee12d495ae529c0369a7.serveo.net';

interface BalanceContextType {
  balance: number;
  addToBalance: (amount: number) => Promise<void>;
  updateBalanceFromServer: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lp = useLaunchParams();

  const updateBalanceFromServer = useCallback(async () => {
    console.log('Updating balance from server...');
    if (!lp.initData?.user?.id) {
      console.warn('User ID not available');
      setError('ID пользователя недоступен');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Sending request to:', `${BACKEND_URL}/users/${lp.initData.user.id}/balance`);
      const response = await axios.get(`${BACKEND_URL}/users/${lp.initData.user.id}/balance`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        withCredentials: true,
      });
      console.log('Balance response:', response.data);
      if (typeof response.data.balance === 'number') {
        setBalance(response.data.balance);
      } else {
        console.error('Invalid balance data received:', response.data);
        setError('Получены некорректные данные баланса');
      }
    } catch (error) {
      console.error('Error updating balance:', error);
      setError('Не удалось обновить баланс');
    } finally {
      setIsLoading(false);
    }
  }, [lp.initData?.user?.id]);

  const addToBalance = useCallback(async (amount: number) => {
    if (!lp.initData?.user?.id) {
      console.warn('User ID not available');
      setError('ID пользователя недоступен');
      return;
    }

    try {
      setError(null);
      // Оптимистичное обновление UI
      setBalance((prevBalance) => prevBalance + amount);

      console.log('Sending request to:', `${BACKEND_URL}/users/${lp.initData.user.id}/add-balance`);
      const response = await axios.post(`${BACKEND_URL}/users/${lp.initData.user.id}/add-balance`, 
        { amount },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          withCredentials: true,
        }
      );

      console.log('Add balance response:', response.data);
      if (typeof response.data.balance === 'number') {
        setBalance(response.data.balance);
      } else {
        console.error('Invalid balance data received:', response.data);
        setError('Получены некорректные данные баланса');
      }
    } catch (error) {
      console.error('Error adding to balance:', error);
      // В случае ошибки, откатываем изменение
      setBalance((prevBalance) => prevBalance - amount);
      setError('Не удалось добавить к балансу');
      throw error;
    }
  }, [lp.initData?.user?.id]);

  useEffect(() => {
    updateBalanceFromServer();
  }, [updateBalanceFromServer]);

  return (
    <BalanceContext.Provider value={{ balance, addToBalance, updateBalanceFromServer, isLoading, error }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};