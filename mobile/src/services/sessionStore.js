import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'wh_mobile_session_v1';

export const loadSession = async () => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const saveSession = async (session) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};
