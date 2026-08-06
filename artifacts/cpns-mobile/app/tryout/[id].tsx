import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, TryoutBundle, StartSessionResponse } from '@/lib/api';

interface TryoutDetail extends TryoutBundle {
  sections?: { category: string; questionCount: number; passingScore?: number }[];
}

export default function TryoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tryout, isLoading, isError } = useQuery({
    queryKey: ['tryout', id],
    queryFn: () =>
      apiGet<{ tryout: TryoutDetail }>(`/participant/tryouts/${id}`).then((d) => d.tryout),
    enabled: !!id && !!user,
  });

  const startMutation = useMutation({
    mutationFn: () => apiPost<StartSessionResponse>(`/participant/tryouts/${id}/sessions`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['results'] });
      // Backend returns { session: { id: string, ... } }
      router.push(`/session/${data.session.id}`);
    },
    onError: (err) => {
      Alert.alert('Gagal memulai', (err as Error).message);
    },
  });

  const handleStart = async () => {
    if (!tryout) return;
    const locked = tryout.isPremium && user?.subscription?.status !== 'active';
    if (locked) {
      Alert.alert(
        'Butuh langganan',
        'Tryout ini memerlukan akses premium. Berlangganan melalui web app.',
      );
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startMutation.mutate();
  };

  const s = styles(colors, insets);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !tryout) {
    return (
      <View style={s.center}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={s.errorText}>Gagal memuat tryout</Text>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const locked = tryout.isPremium && user?.subscription?.status !== 'active';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero banner */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Feather name="file-text" size={32} color={colors.accent} />
          </View>
          {tryout.isPremium && (
            <View style={s.premiumBadge}>
              <Feather name="star" size={12} color="#b45309" />
              <Text style={s.premiumText}>Premium</Text>
            </View>
          )}
          <Text style={s.heroTitle}>{tryout.title}</Text>
          {tryout.description ? (
            <Text style={s.heroDesc}>{tryout.description}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {tryout.totalQuestions != null && (
            <View style={s.stat}>
              <Text style={s.statVal}>{tryout.totalQuestions}</Text>
              <Text style={s.statLbl}>Soal</Text>
            </View>
          )}
          {tryout.duration != null && (
            <View style={s.stat}>
              <Text style={s.statVal}>{tryout.duration}'</Text>
              <Text style={s.statLbl}>Menit</Text>
            </View>
          )}
          {(tryout.sections?.length ?? 0) > 0 && (
            <View style={s.stat}>
              <Text style={s.statVal}>{tryout.sections!.length}</Text>
              <Text style={s.statLbl}>Bagian</Text>
            </View>
          )}
        </View>

        {/* Sections */}
        {(tryout.sections?.length ?? 0) > 0 && (
          <>
            <Text style={s.sectionTitle}>Komposisi Soal</Text>
            {tryout.sections!.map((sec, i) => (
              <View key={i} style={s.secRow}>
                <View style={s.secBullet} />
                <Text style={s.secCategory}>{sec.category}</Text>
                <Text style={s.secCount}>{sec.questionCount} soal</Text>
                {sec.passingScore != null && (
                  <Text style={s.secPassing}>Min. {sec.passingScore}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {locked && (
          <View style={s.lockedCard}>
            <Feather name="lock" size={20} color={colors.mutedForeground} />
            <Text style={s.lockedText}>
              Tryout ini memerlukan langganan premium. Berlangganan melalui web app CPNS Tryout.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Start button */}
      <View style={[s.footer, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <Pressable
          style={({ pressed }) => [
            s.startBtn,
            locked && s.startBtnLocked,
            pressed && s.pressed,
            startMutation.isPending && s.disabled,
          ]}
          onPress={handleStart}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name={locked ? 'lock' : 'play'} size={20} color="#fff" />
              <Text style={s.startBtnText}>
                {locked ? 'Butuh Langganan' : 'Mulai Tryout'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background },
    errorText: { fontSize: 15, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    backBtn: { backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { fontSize: 14, color: colors.foreground, fontFamily: 'Inter_500Medium' },
    content: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 : 8,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    hero: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245,159,10,0.15)',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    premiumText: { color: '#b45309', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    heroTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, textAlign: 'center' },
    heroDesc: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    stat: { alignItems: 'center', gap: 4 },
    statVal: { fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.primary },
    statLbl: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 12 },
    secRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    secBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    secCategory: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground, flex: 1 },
    secCount: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    secPassing: { fontSize: 12, color: colors.primary, fontFamily: 'Inter_600SemiBold' },
    lockedCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.muted,
      borderRadius: 14,
      padding: 16,
      marginTop: 20,
    },
    lockedText: { flex: 1, fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    startBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    startBtnLocked: { backgroundColor: colors.mutedForeground },
    startBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.5 },
  });
