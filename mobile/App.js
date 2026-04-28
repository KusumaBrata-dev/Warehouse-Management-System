import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { clearSession, loadSession, saveSession } from './src/services/sessionStore';
import { setAuthToken, setUnauthorizedHandler } from './src/services/apiClient';
import { colors } from './src/theme/colors';

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await clearSession();
    setSession(null);
  }, []);

  const onLoggedIn = useCallback(
    async (nextSession) => {
      setAuthToken(nextSession.token);
      await saveSession(nextSession);
      setSession(nextSession);
    },
    [],
  );

  useEffect(() => {
    const boot = async () => {
      const saved = await loadSession();
      if (saved?.token) {
        setAuthToken(saved.token);
        setSession(saved);
      }
      setBooting(false);
    };
    boot();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  if (booting) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <>
      {session ? (
        <AppNavigator session={session} onLogout={logout} />
      ) : (
        <LoginScreen onLoggedIn={onLoggedIn} />
      )}
      <StatusBar style='dark' />
    </>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
