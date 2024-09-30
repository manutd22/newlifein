import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@telegram-apps/telegram-ui';
import { DisplayData, DisplayDataRow } from '@/components/DisplayData/DisplayData';
import { useBalance } from '@/context/balanceContext';
import { initUtils, useLaunchParams } from '@telegram-apps/sdk-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabaseClient';

interface Quest {
  id: number;
  title: string;
  reward: number;
  type: string;
  progress?: number | boolean;
}

const utils = initUtils();
const SUBSCRIPTION_CHANNEL = 'sexinandout';
const BOT_USERNAME = 'prosexin_bot';
const APP_NAME = 'sexin';

export const QuestsComponent: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToBalance } = useBalance();
  const lp = useLaunchParams();
  const [tonConnectUI] = useTonConnectUI();
  const [walletConnected, setWalletConnected] = useState(false);

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

  const fetchQuests = useCallback(async () => {
    console.log('Fetching quests...');
    if (!lp.initData?.user?.id) {
      console.warn('User ID not available');
      showPopup('Ошибка', 'ID пользователя недоступен');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', lp.initData.user.id);

      if (error) throw error;

      console.log('Quests data:', data);
      setQuests(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading quests:", error);
      showPopup('Ошибка', 'Не удалось загрузить квесты. Пожалуйста, попробуйте позже.');
      setError("Failed to load quests. Please try again later.");
      setIsLoading(false);
    }
  }, [lp.initData?.user?.id, showPopup]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange(
      wallet => {
        if (wallet) {
          setWalletConnected(true);
          updateWalletConnectionStatus(true);
        } else {
          setWalletConnected(false);
          updateWalletConnectionStatus(false);
        }
      } 
    );

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

  const updateWalletConnectionStatus = async (isConnected: boolean) => {
    if (!lp.initData?.user?.id) {
      console.warn('User ID not available');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ wallet_connected: isConnected })
        .eq('id', lp.initData.user.id);

      if (error) throw error;

      fetchQuests();
    } catch (error) {
      console.error("Error updating wallet connection status:", error);
    }
  };

  const handleChannelSubscription = async () => {
    const channelUrl = `https://t.me/${SUBSCRIPTION_CHANNEL}`;
    
    utils.openTelegramLink(channelUrl);

    showPopup('Подписка на канал', `Пожалуйста, подпишитесь на канал @${SUBSCRIPTION_CHANNEL} и затем нажмите "Проверить подписку".`);
  };

  const checkSubscription = async (quest: Quest) => {
    if (!lp.initData?.user?.id) {
      showPopup('Ошибка', 'ID пользователя недоступен');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('channel_subscriptions')
        .select('is_subscribed')
        .eq('user_id', lp.initData.user.id)
        .eq('channel_username', SUBSCRIPTION_CHANNEL)
        .single();

      if (error) throw error;

      if (data?.is_subscribed) {
        await completeQuest(quest);
      } else {
        showPopup('Ошибка', `Вы не подписаны на канал @${SUBSCRIPTION_CHANNEL}. Пожалуйста, подпишитесь и попробуйте снова.`);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      showPopup('Ошибка', 'Не удалось проверить подписку. Пожалуйста, попробуйте позже.');
    }
  };

  const completeQuest = async (quest: Quest) => {
    if (!lp.initData?.user?.id) {
      showPopup('Ошибка', 'ID пользователя недоступен');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('quests')
        .update({ completed: true })
        .eq('id', quest.id)
        .eq('user_id', lp.initData.user.id);

      if (error) throw error;

      if (data) {
        addToBalance(quest.reward);
        setQuests(quests.filter(q => q.id !== quest.id));
        showPopup('Успех', 'Квест успешно выполнен!');
        
        if (quest.type === 'DAILY_BONUS') {
          fetchQuests();
        }
      } else {
        throw new Error('Failed to complete quest');
      }
    } catch (error) {
      console.error("Error completing quest:", error);
      showPopup('Ошибка', 'Произошла ошибка при выполнении квеста. Пожалуйста, попробуйте позже.');
    }
  };

  const generateInviteLink = useCallback(() => {
    if (!lp.initData?.user?.id) {
      console.error('User ID not available');
      return null;
    }
    return `https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=invite_${lp.initData.user.id}`;
  }, [lp.initData?.user?.id]);

  const connectWallet = async () => {
    try {
      await tonConnectUI.connectWallet();
      showPopup('Успех', 'Кошелек успешно подключен');
      const connectWalletQuest = quests.find(q => q.type === 'CONNECT_WALLET');
      if (connectWalletQuest) {
        await completeQuest(connectWalletQuest);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      showPopup('Ошибка', 'Не удалось подключить кошелек. Пожалуйста, попробуйте позже.');
    }
  };

  const handleQuestCompletion = async (quest: Quest) => {
    if (quest.type === 'CHANNEL_SUBSCRIPTION') {
      await handleChannelSubscription();
    } else if (quest.type === 'INVITE_FRIENDS') {
      const referralLink = generateInviteLink();
      if (referralLink) {
        showPopup('Пригласить друзей', `Ваша реферальная ссылка: ${referralLink}\nПоделитесь ею с друзьями, чтобы выполнить квест!`);
        navigator.clipboard.writeText(referralLink)
          .then(() => console.log('Referral link copied to clipboard'))
          .catch(err => console.error('Failed to copy referral link:', err));
      } else {
        showPopup('Ошибка', 'Не удалось создать реферальную ссылку. Пожалуйста, попробуйте позже.');
      }
    } else if (quest.type === 'CONNECT_WALLET') {
      await connectWallet();
    } else if (quest.type === 'DAILY_BONUS') {
      const { data, error } = await supabase
        .rpc('is_daily_bonus_available', { user_id: lp.initData?.user?.id });
      
      if (error) {
        console.error("Error checking daily bonus availability:", error);
        showPopup('Ошибка', 'Не удалось проверить доступность ежедневного бонуса. Попробуйте позже.');
      } else if (data) {
        await completeQuest(quest);
      } else {
        showPopup('Ошибка', 'Ежедневный бонус еще не доступен. Попробуйте позже.');
      }
    } else {
      await completeQuest(quest);
    }
  };

  const renderQuestProgress = (quest: Quest) => {
    if (quest.type === 'INVITE_FRIENDS') {
      return <span style={{ marginLeft: '10px' }}>Прогресс: {quest.progress as number}/5</span>;
    } else if (quest.type === 'DAILY_BONUS') {
      return <span style={{ marginLeft: '10px' }}>Статус: {quest.progress ? 'Доступен' : 'Недоступен'}</span>;
    } else if (typeof quest.progress === 'boolean') {
      return <span style={{ marginLeft: '10px' }}>Статус: {quest.progress ? 'Выполнено' : 'Не выполнено'}</span>;
    }
    return null;
  };

  const questRows: DisplayDataRow[] = quests.map(quest => ({
    title: quest.title,
    value: (
      <>
        <span>Награда: {quest.reward} BallCry</span>
        {renderQuestProgress(quest)}
        <Button onClick={() => handleQuestCompletion(quest)} style={{ marginLeft: '10px' }}>
          {quest.type === 'CHANNEL_SUBSCRIPTION' ? 'Подписаться' : 
           quest.type === 'INVITE_FRIENDS' ? 'Пригласить друзей' :
           quest.type === 'CONNECT_WALLET' ? 'Подключить кошелек' :
           quest.type === 'DAILY_BONUS' ? 'Получить бонус' : 'Выполнить'}
        </Button>
        {quest.type === 'CHANNEL_SUBSCRIPTION' && (
          <Button onClick={() => checkSubscription(quest)} style={{ marginLeft: '10px' }}>
            Проверить подписку
          </Button>
        )}
        {quest.type === 'INVITE_FRIENDS' && (quest.progress as number) >= 5 && (
          <Button onClick={() => completeQuest(quest)} style={{ marginLeft: '10px' }}>
            Завершить квест
          </Button>
        )}
      </>
    )
  }));

  return (
    <div>
      <h2>Доступные квесты</h2>
      <TonConnectButton />
      {isLoading ? (
        <div>Загрузка квестов...</div>
      ) : error ? (
        <div>{error}</div>
      ) : quests.length > 0 ? (
        <DisplayData
          header="Квесты"
          rows={questRows}
        />
      ) : (
        <p>У вас нет доступных квестов.</p>
      )}
      {walletConnected && <p>Кошелек подключен</p>}
    </div>
  );
};

export default QuestsComponent;