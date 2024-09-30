import { FC, useState, useEffect, useCallback } from 'react';
import { initUtils, useLaunchParams } from '@telegram-apps/sdk-react';
import { NavigationBar } from '@/components/NavigationBar/NavigationBar';
import { supabase } from '@/lib/supabaseClient';

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
      const { data, error } = await supabase
        .from('referrals')
        .select('id, username, firstName, lastName')
        .eq('referrer_id', lp.initData.user.id);

      if (error) throw error;

      if (Array.isArray(data)) {
        setReferrals(data);
      } else {
        console.error('Unexpected response format:', data);
        showPopup('Ошибка', 'Получен неожиданный формат данных. Проверьте консоль для деталей.');
        setError('Неожиданный формат данных');
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
      showPopup('Ошибка', `Не удалось загрузить рефералов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      setError(`Ошибка загрузки рефералов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
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
    <div style={{ paddingBottom: '60px' }}>
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
      <NavigationBar />
    </div>
  );
};

export default FriendsPage;