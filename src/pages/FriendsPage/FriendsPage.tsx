import { FC, useState, useEffect, useCallback } from 'react';
import { initUtils, useLaunchParams } from '@telegram-apps/sdk-react';
import axios, { AxiosError } from 'axios';
import { NavigationBar } from '@/components/NavigationBar/NavigationBar';

interface Referral {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          startParam?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        showPopup: (params: { title: string; message: string; buttons: Array<{ type: string }> }) => void;
        shareUrl: (url: string) => void;
        close: () => void;
      };
    };
  }
}

const utils = initUtils();
const BACKEND_URL = 'https://63091712ee14ee12d495ae529c0369a7.serveo.net';
const BOT_USERNAME = 'prosexin_bot';
const APP_NAME = 'sexin';

export const FriendsPage: FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lp = useLaunchParams();
  
  const showPopup = useCallback((title: string, message: string) => {
    if (window.Telegram?.WebApp?.showPopup) {
      window.Telegram.WebApp.showPopup({
        title,
        message,
        buttons: [{ type: 'ok' }]
      });
    } else {
      console.warn('Telegram WebApp API is not available');
      alert(`${title}: ${message}`);
    }
  }, []);

  const fetchReferrals = useCallback(async () => {
    console.log('Fetching referrals...');
    if (!lp.initData?.user?.id) {
      console.warn('User ID not available');
      showPopup('Ошибка', 'ID пользователя недоступен');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/users/${lp.initData.user.id}/referrals`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        withCredentials: true,
      });
      console.log('Full response:', response);
      console.log('Response headers:', response.headers);
      console.log('Response data:', response.data);

      if (Array.isArray(response.data)) {
        setReferrals(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setReferrals(response.data.data);
      } else if (response.data === null || (Array.isArray(response.data) && response.data.length === 0)) {
        setReferrals([]);
      } else {
        console.error('Unexpected response format:', response.data);
        showPopup('Ошибка', 'Получен неожиданный формат данных. Проверьте консоль для деталей.');
        setError('Неожиданный формат данных');
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
      let errorMessage = 'Неизвестная ошибка';
      
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        if (axiosError.response) {
          console.error('Error response:', axiosError.response);
          console.error('Error response data:', axiosError.response.data);
          errorMessage = `Ошибка сервера: ${axiosError.response.status}`;
        } else if (axiosError.request) {
          console.error('No response received:', axiosError.request);
          errorMessage = 'Нет ответа от сервера';
        } else {
          console.error('Error setting up request:', axiosError.message);
          errorMessage = `Ошибка запроса: ${axiosError.message}`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      showPopup('Ошибка', `Не удалось загрузить рефералов: ${errorMessage}`);
      setError(`Ошибка загрузки рефералов: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [lp.initData?.user?.id, showPopup]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const generateInviteLink = useCallback(() => {
    if (!lp.initData?.user?.id) {
      console.error('User ID not available');
      return null;
    }
    return `https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=invite_${lp.initData.user.id}`;
  }, [lp.initData?.user?.id]);

  const shareInviteLink = useCallback(() => {
    const inviteLink = generateInviteLink();
    if (inviteLink) {
      console.log('Generated invite link:', inviteLink);
      utils.shareURL(inviteLink, 'Join me in BallCry and get more rewards!');
    } else {
      showPopup('Error', 'Unable to create invite link. Please try again later.');
    }
  }, [generateInviteLink, showPopup]);

  const copyInviteLink = useCallback(() => {
    const inviteLink = generateInviteLink();
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          showPopup('Success', 'Invite link copied to clipboard!');
        })
        .catch(() => {
          showPopup('Error', 'Failed to copy invite link. Please try again.');
        });
    } else {
      showPopup('Error', 'Unable to create invite link. Please try again later.');
    }
  }, [generateInviteLink, showPopup]);

  return (
    <div style={{ paddingBottom: '60px' }}> {/* Добавляем отступ снизу для NavigationBar */}
      <h1>Пригласить друзей</h1>
      <button onClick={shareInviteLink}>Пригласить</button>
      <button onClick={copyInviteLink}>Скопировать ссылку</button>
      <h2>Ваши рефералы</h2>
      {isLoading ? (
        <p>Загрузка рефералов...</p>
      ) : error ? (
        <p>Ошибка: {error}</p>
      ) : referrals.length > 0 ? (
        <ul>
          {referrals.map((referral, index) => (
            <li key={referral.id || index}>
              {referral.firstName || referral.username || 'Неизвестный пользователь'} 
              {referral.lastName ? ` ${referral.lastName}` : ''}
              {referral.username ? ` (@${referral.username})` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>У вас пока нет рефералов</p>
      )}
      <NavigationBar /> {/* Добавляем NavigationBar в конец компонента */}
    </div>
  );
};

export default FriendsPage;
