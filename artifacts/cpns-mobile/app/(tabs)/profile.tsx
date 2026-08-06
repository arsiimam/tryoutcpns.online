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
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiGet<{ subscription: {
      planName: string; status: string; expiresAt: string; daysLeft: number;
    } | null }>('/participant/subscription'),
    enabled: !!user,
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiGet<{ transactions: { id: string; planName: string; amount: number; status: string; createdAt: string }[] }>('/participant/transactions'),
    enabled: !!user,
    select: (d) => d.transactions?.slice(0, 3) ?? [],
  });

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
        },
      },
    ]);
  };

  const s = styles(colors, insets);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const sub = subData?.subscription ?? user?.subscription;
  const isActive = sub?.status === 'active';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatarRing}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.userName}>{user?.fullName ?? user?.email}</Text>
        <Text style={s.userEmail}>{user?.email}</Text>
      </View>

      {/* Subscription */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Langganan</Text>
        <View style={[s.subCard, isActive ? s.subActive : s.subInactive]}>
          <Feather
            name={isActive ? 'star' : 'lock'}
            size={20}
            color={isActive ? colors.accent : colors.mutedForeground}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.subPlan, { color: isActive ? colors.primary : colors.mutedForeground }]}>
              {isActive ? sub!.planName : 'Tidak ada langganan aktif'}
            </Text>
            {isActive && (
              <Text style={s.subExpiry}>Berlaku hingga: {formatDate(sub!.expiresAt)} ({sub!.daysLeft} hari)</Text>
            )}
            {!isActive && (
              <Text style={s.subExpiry}>Berlangganan untuk akses penuh</Text>
            )}
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      {(txData?.length ?? 0) > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Transaksi Terakhir</Text>
          {txData!.map((tx) => (
            <View key={tx.id} style={s.txRow}>
              <View>
                <Text style={s.txPlan}>{tx.planName}</Text>
                <Text style={s.txDate}>{formatDate(tx.createdAt)}</Text>
              </View>
              <View style={[s.txStatus, tx.status === 'success' ? s.txSuccess : s.txPending]}>
                <Text style={[s.txStatusText, { color: tx.status === 'success' ? '#166534' : '#92400e' }]}>
                  {tx.status === 'success' ? 'Berhasil' : 'Menunggu'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={s.section}>
        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && s.pressed]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={s.logoutText}>Keluar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 + 16 : 16,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100),
      paddingHorizontal: 20,
    },
    avatarSection: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
    avatarRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarText: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
    userName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 4 },
    userEmail: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    subCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: 14,
      padding: 16,
    },
    subActive: { backgroundColor: 'rgba(245,159,10,0.1)', borderWidth: 1, borderColor: 'rgba(245,159,10,0.3)' },
    subInactive: { backgroundColor: colors.muted },
    subPlan: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
    subExpiry: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txPlan: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground, marginBottom: 2 },
    txDate: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    txStatus: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
    txSuccess: { backgroundColor: '#dcfce7' },
    txPending: { backgroundColor: '#fef3c7' },
    txStatusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#fef2f2',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    logoutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.destructive },
    pressed: { opacity: 0.75 },
  });
