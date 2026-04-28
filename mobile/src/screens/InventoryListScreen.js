import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import ListItem from '../components/ListItem';
import { fetchStock } from '../services/inventoryApi';
import { colors } from '../theme/colors';

const filters = ['all', 'low', 'out'];

export default function InventoryListScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await fetchStock({ page: 1, limit: 50, search, filter });
      setRows(data.stocks || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal memuat inventory');
    }
  }, [search, filter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Inventory</Text>
        <Input
          label='Search SKU / Nama'
          placeholder='contoh: SKU-001'
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filters}>
          {filters.map((item) => (
            <Button
              key={item}
              label={item.toUpperCase()}
              variant={filter === item ? 'primary' : 'secondary'}
              onPress={() => setFilter(item)}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => `${item.id}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ListItem
                title={`${item.product?.sku || '-'} - ${item.product?.name || '-'}`}
                subtitle={item.locationPath || 'Belum ada lokasi'}
                qty={item.quantity || 0}
                minStock={item.product?.minStock || 0}
                onPress={() =>
                  navigation.navigate('ItemDetail', {
                    productId: item.product?.id,
                    stockId: item.id,
                  })
                }
              />
            )}
            ListEmptyComponent={<Text style={styles.empty}>Tidak ada data.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 16, gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  loader: { marginTop: 12 },
  list: { gap: 10, paddingBottom: 24 },
  error: { color: colors.danger, fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 20 },
});
