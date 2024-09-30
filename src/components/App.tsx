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
import { BalanceProvider } from '@/context/balanceContext';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabaseClient';

import { routes } from '@/navigation/routes';

const saveTelegramUser = async (initDataRaw: string) => {
  try {
    const parsedData = JSON.parse(decodeURIComponent(initDataRaw));
    const userData = {
      telegramId: parsedData.user.id.toString(),
      username: parsedData.user.username,
      firstName: parsedData.user.first_name,
      lastName: parsedData.user.last_name,
      languageCode: parsedData.user.language_code,
      allowsWriteToPm: parsedData.user.allows_write_to_pm,
    };

    // Проверяем, существует ли пользователь
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegramId', userData.telegramId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!existingUser) {
      // Если пользователь не существует, создаем нового
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([userData])
        .single();

      if (insertError) throw insertError;
      console.log('New user created:', newUser);
      return newUser;
    } else {
      // Если пользователь существует, обновляем данные
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('telegramId', userData.telegramId)
        .single();

      if (updateError) throw updateError;
      console.log('User updated:', updatedUser);
      return updatedUser;
    }
  } catch (error) {
    console.error('Failed to save user data:', error);
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
        const savedUser = await saveTelegramUser(lp.initDataRaw);
        setIsDataSaved(true);
        console.log('User data saved successfully', savedUser);
      } catch (error) {
        console.error('Error saving user data:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (!lp.initDataRaw) {
      console.warn('initDataRaw is empty or undefined');
      setIsLoading(false);
    }
  }, [lp, isDataSaved]);

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

  // Проверка подключения к Supabase
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      const { error } = await supabase.from('users').select('count').single();
      if (error) {
        console.error('Supabase connection error:', error);
      } else {
        console.log('Supabase connected successfully');
      }
    };
    checkSupabaseConnection();
  }, []);

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