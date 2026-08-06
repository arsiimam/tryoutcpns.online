import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message ?? 'Login gagal');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message ?? 'Login Google gagal');
    } finally {
      setGoogleLoading(false);
    }
  };

  const s = styles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.logoRing}>
            <Text style={s.logoText}>CPNS</Text>
          </View>
          <Text style={s.heroTitle}>Tryout CPNS</Text>
          <Text style={s.heroSub}>Persiapan ujian ASN terbaik di genggaman</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Masuk ke akunmu</Text>

          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.inputWrapper}>
            <Feather name="mail" size={18} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputWrapper}>
            <Feather name="lock" size={18} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <Pressable onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [s.loginBtn, pressed && s.pressed, loading && s.disabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading
              ? <ActivityIndicator color={colors.primaryForeground} />
              : <Text style={s.loginBtnText}>Masuk</Text>}
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>atau</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [s.googleBtn, pressed && s.pressed, googleLoading && s.disabled]}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading
              ? <ActivityIndicator color={colors.foreground} />
              : (
                <>
                  <FontAwesome name="google" size={18} color="#EA4335" />
                  <Text style={s.googleBtnText}>Lanjutkan dengan Google</Text>
                </>
              )}
          </Pressable>
        </View>

        <Text style={s.footer}>
          Daftar melalui web app jika belum punya akun
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.primary },
    scroll: {
      flexGrow: 1,
      paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20),
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
      paddingHorizontal: 20,
    },
    hero: { alignItems: 'center', marginBottom: 32 },
    logoRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(245,159,10,0.18)',
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: { color: colors.accent, fontSize: 18, fontFamily: 'Inter_700Bold' },
    heroTitle: { color: '#ffffff', fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 8 },
    heroSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
    },
    cardTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 20 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#fef2f2',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      marginBottom: 12,
      height: 48,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    eyeBtn: { padding: 4 },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    loginBtnText: { color: colors.primaryForeground, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.5 },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      height: 50,
    },
    googleBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.foreground },
    footer: {
      textAlign: 'center',
      color: 'rgba(255,255,255,0.5)',
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
    },
  });
