import { Pressable, Text, View, StyleSheet } from 'react-native';
import Card from './Card';
import BadgeStatus from './BadgeStatus';
import { colors } from '../theme/colors';

export default function ListItem({ title, subtitle, qty, minStock = 0, onPress }) {
  let tone = 'normal';
  let badgeLabel = 'Normal';
  if (qty === 0) {
    tone = 'out';
    badgeLabel = 'Out';
  } else if (qty <= minStock) {
    tone = 'low';
    badgeLabel = 'Low';
  }

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
          <Text style={styles.qty}>{qty}</Text>
        </View>
        <BadgeStatus label={badgeLabel} tone={tone} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  qty: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
});
