import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { createTransaction } from '../services/inventoryApi';
import { colors } from '../theme/colors';

const types = ['IN', 'OUT', 'ADJUST', 'MOVE'];

export default function TransactionFormScreen() {
  const [type, setType] = useState('IN');
  const [productId, setProductId] = useState('');
  const [boxId, setBoxId] = useState('');
  const [targetBoxId, setTargetBoxId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!productId || quantity === '') {
      Alert.alert('Validasi', 'Product ID dan Quantity wajib diisi');
      return;
    }

    const parsedQty = Number.parseInt(quantity, 10);
    if (Number.isNaN(parsedQty) || parsedQty < 0) {
      Alert.alert('Validasi', 'Quantity harus angka 0 atau lebih');
      return;
    }

    if (type !== 'ADJUST' && parsedQty <= 0) {
      Alert.alert('Validasi', 'Quantity harus lebih dari 0 untuk IN/OUT/MOVE');
      return;
    }

    if ((type === 'IN' || type === 'OUT' || type === 'MOVE') && !boxId) {
      Alert.alert('Validasi', 'Source Box ID wajib diisi untuk IN/OUT/MOVE');
      return;
    }

    if (type === 'MOVE' && !targetBoxId) {
      Alert.alert('Validasi', 'Target Box ID wajib diisi untuk MOVE');
      return;
    }

    if (type === 'MOVE' && boxId && targetBoxId && boxId === targetBoxId) {
      Alert.alert('Validasi', 'Target Box ID harus berbeda dari Source Box ID');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type,
        productId: Number.parseInt(productId, 10),
        boxId: boxId ? Number.parseInt(boxId, 10) : undefined,
        targetBoxId: targetBoxId ? Number.parseInt(targetBoxId, 10) : undefined,
        quantity: parsedQty,
        lotNumber,
        referenceNo,
        note,
      };

      const result = await createTransaction(payload);
      Alert.alert('Sukses', `Transaksi berhasil. Stok terbaru: ${result.newStock}`);
      setQuantity('');
      setNote('');
      setReferenceNo('');
      setLotNumber('');
      if (type === 'MOVE') {
        setTargetBoxId('');
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Gagal membuat transaksi';
      Alert.alert('Transaksi Gagal', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Form Transaksi</Text>
        <Text style={styles.subtitle}>Stock In / Stock Out / Adjustment / Move</Text>

        <Card>
          <Text style={styles.label}>Tipe Transaksi</Text>
          <View style={styles.rowWrap}>
            {types.map((item) => (
              <Button
                key={item}
                label={item}
                variant={type === item ? 'primary' : 'secondary'}
                onPress={() => setType(item)}
              />
            ))}
          </View>

          <Input label='Product ID' value={productId} onChangeText={setProductId} keyboardType='number-pad' />
          <Input
            label={type === 'MOVE' ? 'Source Box ID' : 'Box ID (opsional untuk ADJUST)'}
            value={boxId}
            onChangeText={setBoxId}
            keyboardType='number-pad'
          />
          {type === 'MOVE' ? (
            <Input label='Target Box ID' value={targetBoxId} onChangeText={setTargetBoxId} keyboardType='number-pad' />
          ) : null}
          <Input label='Quantity' value={quantity} onChangeText={setQuantity} keyboardType='number-pad' />
          <Input label='Lot Number' value={lotNumber} onChangeText={setLotNumber} />
          <Input label='Reference No' value={referenceNo} onChangeText={setReferenceNo} />
          <Input label='Note' value={note} onChangeText={setNote} />

          <Button label={loading ? 'Menyimpan...' : 'Simpan Transaksi'} onPress={submit} disabled={loading} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 10, paddingBottom: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
