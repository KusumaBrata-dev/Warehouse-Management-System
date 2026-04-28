import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import BadgeStatus from '../components/BadgeStatus';
import { fetchStock } from '../services/inventoryApi';
import { colors } from '../theme/colors';
import { getApiBaseUrl } from '../services/apiClient';

export default function DashboardScreen({ navigation, session, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await fetchStock({ page: 1, limit: 10, filter: 'all' });
      setSummary(data.summary);
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal memuat dashboard');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeCenter}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <BadgeStatus label='Core Stable' tone='in' />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.grid}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total SKU</Text>
            <Text style={styles.metricValue}>{summary?.total ?? 0}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Low Stock</Text>
            <Text style={styles.metricValue}>{summary?.lowStock ?? 0}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Out of Stock</Text>
            <Text style={styles.metricValue}>{summary?.outOfStock ?? 0}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Qty</Text>
            <Text style={styles.metricValue}>{summary?.totalQty ?? 0}</Text>
          </Card>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Akun</Text>
          <Text style={styles.accountName}>{session?.user?.name || '-'}</Text>
          <Text style={styles.accountMeta}>{session?.user?.role || '-'}</Text>
          <Text style={styles.apiMeta}>API: {getApiBaseUrl()}</Text>
          <Button label='Keluar' variant='secondary' onPress={onLogout} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          <View style={styles.actions}>
            <Button label='Daftar Inventory' onPress={() => navigation.navigate('InventoryList')} />
            <Button label='Form Transaksi' variant='secondary' onPress={() => navigation.navigate('TransactionForm')} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  container: { padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', gap: 4 },
  metricLabel: { color: colors.textMuted, fontSize: 12 },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  accountName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  accountMeta: { color: colors.textMuted, fontSize: 12, marginTop: -3 },
  apiMeta: { color: colors.textMuted, fontSize: 11 },
  actions: { gap: 10 },
});
