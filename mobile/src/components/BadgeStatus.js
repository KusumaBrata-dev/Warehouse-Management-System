import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const toneMap = {
  normal: { bg: '#eef2f6', text: colors.text },
  low: { bg: '#fff0e5', text: colors.warning },
  out: { bg: '#fee4e2', text: colors.danger },
  in: { bg: '#e3f6ec', text: colors.success },
};

export default function BadgeStatus({ label, tone = 'normal' }) {
  const toneStyle = toneMap[tone] || toneMap.normal;

  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.text, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
