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
import { type FC, useEffect, useMemo, useState, useCallback, createContext } from 'react';
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

// Создаем контекст для пользовательских данных
export const UserContext = createContext<any>(null);

const saveTelegramUser = async (initDataRaw: string) => {
  try {
    console.log('Raw initDataRaw:', initDataRaw);
    
    const params = new URLSearchParams(initDataRaw);
    console.log('Parsed params:', Object.fromEntries(params));
    
    const userString = params.get('user');
    console.log('User string:', userString);
    
    if (!userString) {
      throw new Error('User data not found in initDataRaw');
    }
    
    const user = JSON.parse(decodeURIComponent(userString));
    console.log('Parsed user:', user);

    const userData = {
      telegramId: user.id.toString(),
      username: user.username || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      languageCode: user.languageCode || null,
      allowsWriteToPm: user.allowsWriteToPm || false
    };
    console.log('Prepared userData:', userData);

    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'telegramId' })
      .select()
      .single();

    if (error) throw error;
    console.log('User saved or updated:', data);
    return data;
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
  const [userData, setUserData] = useState<any>(null);

  const saveUserData = useCallback(async () => {
    if (lp.initDataRaw && !isDataSaved) {
      try {
        console.log('Launch params:', lp);
        const savedUser = await saveTelegramUser(lp.initDataRaw);
        setIsDataSaved(true);
        setUserData(savedUser);
        console.log('User data saved and retrieved successfully', savedUser);
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
    <UserContext.Provider value={userData}>
      <TonConnectUIProvider manifestUrl="https://manutd22.github.io/newlf/tonconnect-manifest.json">
        <AppRoot
          appearance={miniApp.isDark ? 'dark' : 'light'}
          platform={['macos', 'ios'].includes(lp.platform) ? 'ios' : 'base'}
        >
          <BalanceProvider>
            <Router location={location} navigator={reactNavigator}>
              <Routes>
                {routes.map((route) => (
                  <Route 
                    key={route.path} 
                    path={route.path} 
                    element={<route.Component />} 
                  />
                ))}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </BalanceProvider>
        </AppRoot>
      </TonConnectUIProvider>
    </UserContext.Provider>
  );
};