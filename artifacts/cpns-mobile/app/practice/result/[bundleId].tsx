import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function PracticeResultScreen() {
  const { bundleId, correct, total } = useLocalSearchParams<{
    bundleId: string;
    correct: string;
    total: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const correctCount = parseInt(correct ?? '0', 10);
  const totalCount = parseInt(total ?? '0', 10);
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const wrongCount = totalCount - correctCount;

  const s = styles(colors, insets);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={[s.ring, { borderColor: pct >= 60 ? '#22c55e' : '#ef4444' }]}>
          <Text style={[s.pctText, { color: pct >= 60 ? '#22c55e' : '#ef4444' }]}>{pct}%</Text>
          <Text style={s.pctLabel}>Benar</Text>
        </View>
        <Text style={s.heroTitle}>{pct >= 80 ? 'Luar Biasa!' : pct >= 60 ? 'Kerja Bagus!' : 'Terus Berlatih!'}</Text>
        <Text style={s.heroSub}>
          {correctCount} benar dari {totalCount} soal
        </Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, s.statCorrect]}>
          <Feather name="check-circle" size={20} color="#166534" />
          <Text style={s.statVal}>{correctCount}</Text>
          <Text style={s.statLbl}>Benar</Text>
        </View>
        <View style={[s.statCard, s.statWrong]}>
          <Feather name="x-circle" size={20} color="#991b1b" />
          <Text style={s.statVal}>{wrongCount}</Text>
          <Text style={s.statLbl}>Salah</Text>
        </View>
        <View style={[s.statCard, s.statTotal]}>
          <Feather name="list" size={20} color={colors.primary} />
          <Text style={s.statVal}>{totalCount}</Text>
          <Text style={s.statLbl}>Total</Text>
        </View>
      </View>

      {/* Actions */}
      <Pressable
        style={({ pressed }) => [s.retryBtn, pressed && s.pressed]}
        onPress={() => {
          router.replace(`/practice/${bundleId}`);
        }}
      >
        <Feather name="refresh-cw" size={18} color={colors.primary} />
        <Text style={s.retryText}>Ulangi Latihan</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.homeBtn, pressed && s.pressed]}
        onPress={() => router.push('/(tabs)/practice')}
      >
        <Text style={s.homeText}>Kembali ke Daftar Latihan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 + 24 : 24,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    hero: { alignItems: 'center', marginBottom: 32 },
    ring: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    pctText: { fontSize: 40, fontFamily: 'Inter_700Bold' },
    pctLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    heroTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 8 },
    heroSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32, width: '100%' },
    statCard: {
      flex: 1,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      gap: 6,
    },
    statCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
    statWrong: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    statTotal: { backgroundColor: 'rgba(16,57,107,0.06)', borderWidth: 1, borderColor: 'rgba(16,57,107,0.15)' },
    statVal: { fontSize: 28, fontFamily: 'Inter_700Bold', color: colors.foreground },
    statLbl: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 14,
      height: 52,
      width: '100%',
      marginBottom: 12,
    },
    retryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.primary },
    homeBtn: {
      backgroundColor: colors.muted,
      borderRadius: 14,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    homeText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.foreground },
    pressed: { opacity: 0.75 },
  });
