import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors } from '../theme/colors';
import { login } from '../services/inventoryApi';
import { setAuthToken } from '../services/apiClient';

export default function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) {
      Alert.alert('Validasi', 'Username dan password wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const data = await login(username, password);
      setAuthToken(data.token);
      onLoggedIn?.(data);
    } catch (err) {
      const message = err?.response?.data?.error || 'Login gagal';
      Alert.alert('Login Gagal', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Warehouse Mobile</Text>
          <Text style={styles.subtitle}>Core logic first. UI minimal wireframe.</Text>

          <Card style={styles.card}>
            <Input label='Username' autoCapitalize='none' value={username} onChangeText={setUsername} />
            <Input label='Password' secureTextEntry value={password} onChangeText={setPassword} />
            <Button label={loading ? 'Memproses...' : 'Masuk'} onPress={submit} disabled={loading} />
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  content: { gap: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: -6 },
  card: { gap: 12 },
});
