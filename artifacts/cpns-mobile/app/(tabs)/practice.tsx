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
import { apiGet, PracticeBundle } from '@/lib/api';

const CATEGORY_COLORS: Record<string, string> = {
  TWK: '#3b82f6',
  TIU: '#8b5cf6',
  TKP: '#10b981',
};

export default function PracticeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['practice-bundles'],
    queryFn: () => apiGet<{ bundles: PracticeBundle[] }>('/participant/practice/bundles'),
    enabled: !!user,
    select: (d) => d.bundles ?? [],
  });

  const s = styles(colors, insets);

  const renderItem = useCallback(({ item }: { item: PracticeBundle }) => {
    const cat = item.category?.toUpperCase() ?? '';
    const catColor = CATEGORY_COLORS[cat] ?? colors.primary;
    const qCount = item.questionCount ?? item.totalQuestions ?? 0;

    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && s.pressed]}
        onPress={() => router.push(`/practice/${item.id}`)}
      >
        <View style={[s.catBar, { backgroundColor: catColor }]} />
        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Text style={s.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          <View style={s.cardFooter}>
            {cat ? (
              <View style={[s.catChip, { backgroundColor: catColor + '1A' }]}>
                <Text style={[s.catText, { color: catColor }]}>{cat}</Text>
              </View>
            ) : null}
            {qCount > 0 && (
              <View style={s.chip}>
                <Feather name="help-circle" size={12} color={colors.mutedForeground} />
                <Text style={s.chipText}>{qCount} soal</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [colors]);

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
          <Text style={s.pageTitle}>Latihan Soal</Text>
          <Text style={s.pageSub}>Berlatih soal per kategori (TWK, TIU, TKP)</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Feather name="book-open" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Belum ada paket latihan</Text>
          <Text style={s.emptyDesc}>Paket latihan akan muncul di sini</Text>
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
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    catBar: { width: 5 },
    cardBody: { flex: 1, padding: 16 },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, flex: 1, marginRight: 8 },
    cardFooter: { flexDirection: 'row', gap: 8 },
    catChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    catText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    chipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    pressed: { opacity: 0.75 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    emptyDesc: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
  });
