import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth-context';
import { apiGet, DashboardData, TryoutResultSummary } from '@/lib/api';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    data: dashboard,
    isLoading: dashLoading,
    refetch: refetchDash,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () =>
      apiGet<{ dashboard: DashboardData }>('/participant/dashboard').then((d) => d.dashboard),
    enabled: !!user,
  });

  const { data: results } = useQuery({
    queryKey: ['results'],
    queryFn: () =>
      apiGet<{ results: TryoutResultSummary[] }>('/participant/results').then(
        (d) => d.results?.slice(0, 3) ?? []
      ),
    enabled: !!user,
  });

  const onRefresh = useCallback(async () => {
    await refetchDash();
  }, [refetchDash]);

  const s = styles(colors, insets);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const sub = user?.subscription;
  const isActive = sub?.status === 'active';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Selamat datang 👋</Text>
          <Text style={s.userName}>{user?.fullName ?? user?.email}</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* Subscription badge */}
      <View style={[s.subBadge, isActive ? s.subActive : s.subInactive]}>
        <Feather name={isActive ? 'check-circle' : 'lock'} size={14} color={isActive ? colors.accent : colors.mutedForeground} />
        <Text style={[s.subText, { color: isActive ? colors.accent : colors.mutedForeground }]}>
          {isActive
            ? `${sub!.planName} — ${sub!.daysLeft} hari tersisa`
            : 'Langganan diperlukan untuk tryout premium'}
        </Text>
      </View>

      {/* Stats */}
      {dashLoading ? (
        <View style={s.statsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.statCard, s.skeleton]} />
          ))}
        </View>
      ) : (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{dashboard?.totalTryoutsDone ?? 0}</Text>
            <Text style={s.statLabel}>Tryout Dikerjakan</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>
              {dashboard?.averageScore != null ? Math.round(dashboard.averageScore) : '-'}
            </Text>
            <Text style={s.statLabel}>Rata-rata Skor</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>
              {dashboard?.rank != null ? `#${dashboard.rank}` : '-'}
            </Text>
            <Text style={s.statLabel}>Peringkat</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={s.sectionTitle}>Mulai Belajar</Text>
      <View style={s.actionsRow}>
        <Pressable
          style={({ pressed }) => [s.actionCard, s.actionPrimary, pressed && s.pressed]}
          onPress={() => router.push('/(tabs)/tryout')}
        >
          <Feather name="file-text" size={24} color="#ffffff" />
          <Text style={s.actionPrimaryText}>Tryout</Text>
          <Text style={s.actionPrimaryDesc}>Simulasi ujian CPNS</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.actionCard, s.actionSecondary, pressed && s.pressed]}
          onPress={() => router.push('/(tabs)/practice')}
        >
          <Feather name="book-open" size={24} color={colors.primary} />
          <Text style={s.actionSecondaryText}>Latihan Soal</Text>
          <Text style={s.actionSecondaryDesc}>Berlatih per kategori</Text>
        </Pressable>
      </View>

      {/* Recent Results */}
      {(results?.length ?? 0) > 0 && (
        <>
          <Text style={s.sectionTitle}>Hasil Terakhir</Text>
          {results!.map((r) => {
            const total = r.score?.total ?? 0;
            const isPassed = r.passed ?? false;
            return (
              <Pressable
                key={r.sessionId}
                style={({ pressed }) => [s.resultCard, pressed && s.pressed]}
                onPress={() => router.push(`/result/${r.sessionId}`)}
              >
                <View style={s.resultLeft}>
                  <Text style={s.resultTitle} numberOfLines={1}>
                    {r.tryoutName ?? `Tryout #${r.tryoutId?.slice(0, 6)}`}
                  </Text>
                  <Text style={s.resultScore}>
                    TWK {Math.round(r.score?.TWK ?? 0)} · TIU {Math.round(r.score?.TIU ?? 0)} · TKP {Math.round(r.score?.TKP ?? 0)}
                  </Text>
                </View>
                <View style={[s.passBadge, isPassed ? s.passYes : s.passNo]}>
                  <Text style={[s.passText, { color: isPassed ? '#166534' : '#991b1b' }]}>
                    {isPassed ? 'Lulus' : 'Tidak Lulus'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 + 16 : 16,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100),
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    greeting: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    userName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 2 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    subBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
      padding: 12,
      marginBottom: 20,
    },
    subActive: { backgroundColor: 'rgba(245,159,10,0.12)', borderWidth: 1, borderColor: 'rgba(245,159,10,0.3)' },
    subInactive: { backgroundColor: colors.muted },
    subText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    skeleton: { height: 80, backgroundColor: colors.muted },
    statValue: { fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.primary, marginBottom: 4 },
    statLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionCard: { flex: 1, borderRadius: 16, padding: 18, gap: 6 },
    actionPrimary: { backgroundColor: colors.primary },
    actionSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    actionPrimaryText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    actionPrimaryDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_400Regular' },
    actionSecondaryText: { color: colors.primary, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    actionSecondaryDesc: { color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' },
    pressed: { opacity: 0.75 },
    resultCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultLeft: { flex: 1, marginRight: 12 },
    resultTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground, marginBottom: 4 },
    resultScore: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    passBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    passYes: { backgroundColor: '#dcfce7' },
    passNo: { backgroundColor: '#fee2e2' },
    passText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  });
