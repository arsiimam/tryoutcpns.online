import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { apiGet, TryoutResult } from '@/lib/api';

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['result', sessionId],
    queryFn: () =>
      apiGet<{ result: TryoutResult }>(`/participant/results/${sessionId}`).then((d) => d.result),
    enabled: !!sessionId,
  });

  const s = styles(colors, insets);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={s.center}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={s.errorText}>Gagal memuat hasil</Text>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const r = data;
  // Backend shape: { score: { TWK, TIU, TKP, total }, passed, tryoutName, rank, totalParticipants }
  const twk = Math.round(r.score?.TWK ?? 0);
  const tiu = Math.round(r.score?.TIU ?? 0);
  const tkp = Math.round(r.score?.TKP ?? 0);
  const total = Math.round(r.score?.total ?? 0);
  const isPassed = r.passed ?? false;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Pass/Fail Hero */}
      <View style={[s.hero, isPassed ? s.heroPass : s.heroFail]}>
        <View style={s.heroIcon}>
          <Feather
            name={isPassed ? 'check-circle' : 'x-circle'}
            size={40}
            color={isPassed ? '#16a34a' : '#dc2626'}
          />
        </View>
        <Text style={[s.heroStatus, { color: isPassed ? '#16a34a' : '#dc2626' }]}>
          {isPassed ? 'LULUS' : 'TIDAK LULUS'}
        </Text>
        {r.tryoutName ? <Text style={s.heroTitle}>{r.tryoutName}</Text> : null}
        <Text style={s.heroScore}>{total}</Text>
        <Text style={s.heroScoreLabel}>Total Nilai</Text>
        {r.rank != null && r.totalParticipants != null && (
          <Text style={s.heroRank}>Peringkat #{r.rank} dari {r.totalParticipants}</Text>
        )}
      </View>

      {/* Score Breakdown */}
      <Text style={s.sectionTitle}>Rincian Nilai</Text>
      <View style={s.breakdownCard}>
        {[
          { label: 'TWK', score: twk },
          { label: 'TIU', score: tiu },
          { label: 'TKP', score: tkp },
        ].map((item) => (
          <View key={item.label} style={s.breakdownRow}>
            <Text style={s.breakdownLabel}>{item.label}</Text>
            <Text style={s.breakdownScore}>{item.score}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <Pressable
        style={({ pressed }) => [s.reviewBtn, pressed && s.pressed]}
        onPress={() => router.push(`/review/${sessionId}`)}
      >
        <Feather name="eye" size={18} color={colors.primary} />
        <Text style={s.reviewBtnText}>Lihat Pembahasan</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.homeBtn, pressed && s.pressed]}
        onPress={() => router.push('/(tabs)/tryout')}
      >
        <Text style={s.homeBtnText}>Kembali ke Daftar Tryout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 : 0,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
      paddingHorizontal: 20,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background },
    errorText: { fontSize: 15, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    backBtn: { backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { fontSize: 14, color: colors.foreground, fontFamily: 'Inter_500Medium' },
    hero: {
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
      marginTop: 8,
    },
    heroPass: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
    heroFail: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    heroIcon: { marginBottom: 4 },
    heroStatus: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
    heroTitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    heroScore: { fontSize: 56, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 8 },
    heroScoreLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    heroRank: { fontSize: 13, color: colors.primary, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 12 },
    breakdownCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 20,
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    breakdownLabel: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground },
    breakdownScore: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.primary },
    reviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 14,
      height: 52,
      marginBottom: 12,
    },
    reviewBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.primary },
    homeBtn: {
      backgroundColor: colors.muted,
      borderRadius: 14,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    homeBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.foreground },
    pressed: { opacity: 0.75 },
  });
