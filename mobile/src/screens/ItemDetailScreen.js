import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import BadgeStatus from '../components/BadgeStatus';
import { fetchProduct, fetchTransactions } from '../services/inventoryApi';
import { colors } from '../theme/colors';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

export default function ItemDetailScreen({ route }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [productData, txData] = await Promise.all([
          fetchProduct(productId),
          fetchTransactions({ productId, limit: 20, page: 1 }),
        ]);
        setProduct(productData);
        setTransactions(txData.transactions || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Gagal memuat detail item');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeCenter}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const qty = product?.stock?.quantity || 0;
  const minStock = product?.minStock || 0;
  const badgeTone = qty === 0 ? 'out' : qty <= minStock ? 'low' : 'normal';
  const badgeLabel = qty === 0 ? 'Out of Stock' : qty <= minStock ? 'Low Stock' : 'Stock Normal';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card>
          <Text style={styles.productName}>{product?.name || '-'}</Text>
          <Text style={styles.sku}>SKU: {product?.sku || '-'}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>Qty: {qty}</Text>
            <Text style={styles.metaText}>Unit: {product?.unit || '-'}</Text>
          </View>
          <BadgeStatus label={badgeLabel} tone={badgeTone} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
          {transactions.length === 0 ? (
            <Text style={styles.empty}>Belum ada transaksi.</Text>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txType}>{tx.type}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                </View>
                <Text style={styles.txQty}>{tx.quantity}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  container: { padding: 16, gap: 12, paddingBottom: 24 },
  error: { color: colors.danger, fontSize: 13 },
  productName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sku: { color: colors.textMuted, fontSize: 13 },
  meta: { flexDirection: 'row', gap: 14 },
  metaText: { color: colors.text, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 13 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  txLeft: { gap: 4 },
  txType: { color: colors.text, fontWeight: '700' },
  txDate: { color: colors.textMuted, fontSize: 12 },
  txQty: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
