import { useIntegration } from '@telegram-apps/react-router-integration';
import {
  bindMiniAppCSSVars,
  bindThemeParamsCSSVars,
  bindViewportCSSVars,
  initNavigator,
  useLaunchParams,
  useMiniApp,
  useThemeParams,
  useViewport,
} from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { type FC, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Navigate,
  Route,
  Router,
  Routes,
} from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { BalanceProvider } from '@/context/balanceContext';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import { routes } from '@/navigation/routes.tsx';

// Инициализация Supabase клиента с использованием переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Отсутствуют необходимые переменные окружения для Supabase');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const saveOrUpdateTelegramUser = async (initDataRaw: string) => {
  try {
    const initData = JSON.parse(decodeURIComponent(initDataRaw));
    const { user } = initData;

    const { data, error } = await supabase
      .from('users')
      .upsert({
        telegramId: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        languageCode: user.language_code,
        isPremium: user.is_premium || false,
        // Добавьте другие поля, которые вы хотите сохранить
      }, {
        onConflict: 'telegramId'
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to save or update user data:', error);
    throw error;
  }
};

export const App: FC = () => {
  const lp = useLaunchParams();
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const saveUserData = useCallback(async () => {
    if (lp.initDataRaw && !isDataSaved) {
      try {
        console.log('Launch params:', lp);
        
        await saveOrUpdateTelegramUser(lp.initDataRaw);
        setIsDataSaved(true);
        console.log('User data saved or updated successfully');
      } catch (error) {
        console.error('Error saving or updating user data:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (!lp.initDataRaw) {
      console.warn('initDataRaw is empty or undefined');
      setIsLoading(false);
    }
  }, [lp.initDataRaw, isDataSaved]);

  useEffect(() => {
    saveUserData();
  }, [saveUserData]);

  useEffect(() => {
    return bindMiniAppCSSVars(miniApp, themeParams);
  }, [miniApp, themeParams]);

  useEffect(() => {
    return bindThemeParamsCSSVars(themeParams);
  }, [themeParams]);

  useEffect(() => {
    return viewport && bindViewportCSSVars(viewport);
  }, [viewport]);

  const navigator = useMemo(() => initNavigator('app-navigation-state'), []);
  const [location, reactNavigator] = useIntegration(navigator);

  useEffect(() => {
    navigator.attach();
    return () => navigator.detach();
  }, [navigator]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <TonConnectUIProvider manifestUrl="https://manutd22.github.io/newlf/tonconnect-manifest.json">
      <AppRoot
        appearance={miniApp.isDark ? 'dark' : 'light'}
        platform={['macos', 'ios'].includes(lp.platform) ? 'ios' : 'base'}
      >
        <BalanceProvider>
          <Router location={location} navigator={reactNavigator}>
            <Routes>
              {routes.map((route) => (
                <Route key={route.path} path={route.path} element={<route.Component />} />
              ))}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </BalanceProvider>
      </AppRoot>
    </TonConnectUIProvider>
  );
};