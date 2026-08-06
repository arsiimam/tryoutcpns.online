import React, { useState, useCallback } from 'react';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPost, Question, PracticeSubmitResult, questionText } from '@/lib/api';

interface BundleQuestionsResponse {
  questions: Question[];
  bundle?: { name: string; category?: string };
}

export default function PracticeSessionScreen() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  // answers: { [questionId]: optionKey }
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['practice-questions', bundleId],
    queryFn: () => apiGet<BundleQuestionsResponse>(`/participant/practice/bundles/${bundleId}/questions`),
    enabled: !!bundleId,
  });

  const submitMutation = useMutation({
    mutationFn: (answerMap: Record<string, string>) =>
      // Backend expects: { answers: { questionId: answerKey } }
      apiPost<{ correctCount: number; totalQuestions: number }>(
        `/participant/practice/bundles/${bundleId}/submit`,
        { answers: answerMap }
      ),
    onSuccess: (res) => {
      router.replace({
        pathname: '/practice/result/[bundleId]',
        params: {
          bundleId: bundleId!,
          correct: String(res.correctCount),
          total: String(res.totalQuestions),
        },
      });
    },
    onError: (err) => Alert.alert('Gagal', (err as Error).message),
  });

  const handleSelect = useCallback(async (questionId: string, optionKey: string) => {
    await Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  }, []);

  const handleSubmit = useCallback(() => {
    const questions = data?.questions ?? [];
    const unanswered = questions.length - Object.keys(answers).length;
    Alert.alert(
      'Selesaikan Latihan',
      unanswered > 0 ? `${unanswered} soal belum dijawab. Lanjutkan?` : 'Kirim jawaban?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Kirim', onPress: () => submitMutation.mutate(answers) },
      ]
    );
  }, [data, answers, submitMutation]);

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
        <Text style={s.errorText}>Gagal memuat soal</Text>
      </View>
    );
  }

  const questions = data.questions ?? [];
  const question: Question | undefined = questions[currentIndex];
  if (!question) return null;

  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const selectedKey = answers[question.id];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={s.headerTitle}>{data.bundle?.name ?? 'Latihan Soal'}</Text>
          <Text style={s.headerSub}>{currentIndex + 1} / {questions.length}</Text>
        </View>
        <View style={s.headerRight} />
      </View>

      {/* Progress */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.categoryChip}>
          <Text style={s.categoryText}>{question.categoryId ?? question.category ?? ''}</Text>
        </View>

        <Text style={s.questionText}>{questionText(question)}</Text>

        <View style={s.options}>
          {question.options.map((opt) => {
            const isSelected = selectedKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  s.option,
                  isSelected && s.optionSelected,
                  pressed && !isSelected && s.optionHover,
                ]}
                onPress={() => handleSelect(question.id, opt.key)}
              >
                <View style={[s.optLabel, isSelected && s.optLabelSelected]}>
                  <Text style={[s.optLabelText, isSelected && s.optLabelTextSel]}>{opt.key}</Text>
                </View>
                <Text style={[s.optText, isSelected && s.optTextSel]}>{opt.text}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <Pressable
          style={({ pressed }) => [s.navBtn, pressed && s.pressed, currentIndex === 0 && s.disabled]}
          onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <Feather name="arrow-left" size={20} color={currentIndex === 0 ? colors.mutedForeground : colors.foreground} />
        </Pressable>

        {currentIndex < questions.length - 1 ? (
          <Pressable
            style={({ pressed }) => [s.nextBtn, pressed && s.pressed]}
            onPress={() => setCurrentIndex((i) => i + 1)}
          >
            <Text style={s.nextBtnText}>Berikutnya</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [s.nextBtn, pressed && s.pressed, submitMutation.isPending && s.disabled]}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.nextBtnText}>Selesaikan</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background },
    errorText: { fontSize: 15, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, textAlign: 'center' },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    headerRight: { width: 22 },
    progressTrack: { height: 3, backgroundColor: colors.muted },
    progressFill: { height: 3, backgroundColor: colors.primary },
    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    categoryChip: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(16,57,107,0.1)',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 16,
    },
    categoryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary },
    questionText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.foreground, lineHeight: 26, marginBottom: 24 },
    options: { gap: 10 },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      backgroundColor: colors.card,
    },
    optionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(16,57,107,0.06)' },
    optionHover: { backgroundColor: colors.muted },
    optLabel: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    optLabelSelected: { backgroundColor: colors.primary },
    optLabelText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.mutedForeground },
    optLabelTextSel: { color: '#fff' },
    optText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, lineHeight: 22 },
    optTextSel: { color: colors.primary, fontFamily: 'Inter_500Medium' },
    bottomNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    navBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    nextBtn: {
      flex: 1,
      marginLeft: 16,
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    nextBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.4 },
  });
