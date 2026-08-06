import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
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
import { apiGet, TryoutBundle } from '@/lib/api';

interface TryoutListItem extends TryoutBundle {
  hasActiveSession?: boolean;
  lastScore?: number | null;
}

export default function TryoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tryouts'],
    queryFn: () => apiGet<{ tryouts: TryoutListItem[] }>('/participant/tryouts'),
    enabled: !!user,
    select: (d) => d.tryouts ?? [],
  });

  const s = styles(colors, insets);

  const renderItem = useCallback(({ item }: { item: TryoutListItem }) => {
    const locked = item.isPremium && user?.subscription?.status !== 'active';
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && s.pressed]}
        onPress={() => router.push(`/tryout/${item.id}`)}
      >
        <View style={s.cardHeader}>
          <View style={[s.iconBg, locked ? s.iconBgLocked : s.iconBgActive]}>
            <Feather
              name={locked ? 'lock' : 'file-text'}
              size={18}
              color={locked ? colors.mutedForeground : colors.primary}
            />
          </View>
          <View style={s.cardMeta}>
            {item.isPremium && (
              <View style={s.premiumBadge}>
                <Text style={s.premiumText}>Premium</Text>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>

        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>

        {item.description ? (
          <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={s.cardFooter}>
          {item.totalQuestions != null && (
            <View style={s.chip}>
              <Feather name="help-circle" size={12} color={colors.mutedForeground} />
              <Text style={s.chipText}>{item.totalQuestions} soal</Text>
            </View>
          )}
          {item.duration != null && (
            <View style={s.chip}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={s.chipText}>{item.duration} menit</Text>
            </View>
          )}
          {item.lastScore != null && (
            <View style={[s.chip, s.chipScore]}>
              <Text style={s.chipScoreText}>Skor: {Math.round(item.lastScore)}</Text>
            </View>
          )}
        </View>

        {locked && (
          <View style={s.lockedOverlay}>
            <Text style={s.lockedText}>Butuh langganan premium</Text>
          </View>
        )}
      </Pressable>
    );
  }, [colors, user]);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!!(data && data.length > 0)}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <View style={s.listHeader}>
          <Text style={s.pageTitle}>Daftar Tryout</Text>
          <Text style={s.pageSub}>Pilih tryout untuk mulai berlatih</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Belum ada tryout</Text>
          <Text style={s.emptyDesc}>Tryout akan muncul di sini</Text>
        </View>
      }
    />
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    list: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 + 8 : 8,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100),
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 4, paddingVertical: 12 },
    pageTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground },
    pageSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconBg: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    iconBgActive: { backgroundColor: 'rgba(16,57,107,0.1)' },
    iconBgLocked: { backgroundColor: colors.muted },
    cardMeta: { flex: 1 },
    premiumBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(245,159,10,0.15)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    premiumText: { color: '#b45309', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
    cardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 6 },
    cardDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 12 },
    cardFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    chipScore: { backgroundColor: 'rgba(16,57,107,0.1)' },
    chipScoreText: { fontSize: 12, color: colors.primary, fontFamily: 'Inter_600SemiBold' },
    lockedOverlay: {
      marginTop: 12,
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
    },
    lockedText: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    pressed: { opacity: 0.75 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    emptyDesc: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
  });
