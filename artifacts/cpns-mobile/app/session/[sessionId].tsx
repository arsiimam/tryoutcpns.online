import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  apiGet, apiPut, apiPost,
  SessionWithQuestions, Question, questionText,
} from '@/lib/api';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function SessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  // answers: { [questionId]: optionKey }  e.g. { "q1": "A", "q2": "C" }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => apiGet<SessionWithQuestions>(`/participant/sessions/${sessionId}`),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (data?.session) {
      // Backend answers: { questionId: answerKey }
      setAnswers(data.session.answers ?? {});
      // Backend flagged: string[]
      setFlags(new Set(data.session.flagged ?? []));
    }
  }, [data?.session?.id]);

  // ── Optimistic save-as-you-go (best-effort, last-write-wins per question) ─
  // Uses a pending queue so rapid selections don't produce concurrent PUT races
  // for the same question.  In-flight tracking prevents duplicate concurrent
  // sends; the queue replays the latest value after the in-flight one settles.
  const inFlight = useRef<Set<string>>(new Set());
  const pendingQueue = useRef<Map<string, string>>(new Map());

  const saveAnswer = useCallback((questionId: string, answerKey: string) => {
    pendingQueue.current.set(questionId, answerKey);
    if (inFlight.current.has(questionId)) return; // queued value will be sent after

    const flush = async (qid: string): Promise<void> => {
      const next = pendingQueue.current.get(qid);
      if (next === undefined) return;
      pendingQueue.current.delete(qid);
      inFlight.current.add(qid);
      try {
        await apiPut(`/participant/sessions/${sessionId}/answer`, { questionId: qid, answer: next });
      } catch {
        // best-effort background save; canonical truth is local state
      } finally {
        inFlight.current.delete(qid);
        // Replay latest value if another selection arrived while we were in-flight
        await flush(qid);
      }
    };

    flush(questionId);
  }, [sessionId]);

  /**
   * Before submitting, re-send EVERY locally-selected answer from the
   * authoritative `answers` state snapshot (passed as argument so the closure
   * sees the latest value).
   *
   * Rationale: some answers may still be in-flight or may have failed silently
   * in the background queue.  Re-sending all of them with Promise.allSettled
   * makes the final state on the server match exactly what the user sees.
   * If any PUT fails we throw so the submit is blocked and the user is informed.
   */
  const flushAllAnswers = useCallback(async (currentAnswers: Record<string, string>) => {
    const entries = Object.entries(currentAnswers);
    if (entries.length === 0) return;
    const results = await Promise.allSettled(
      entries.map(([qid, key]) =>
        apiPut(`/participant/sessions/${sessionId}/answer`, { questionId: qid, answer: key })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      throw new Error(
        `${failed} jawaban gagal tersimpan. Periksa koneksi internet dan coba lagi.`
      );
    }
  }, [sessionId]);

  const handleSelectAnswer = useCallback(async (questionId: string, optionKey: string) => {
    await Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
    saveAnswer(questionId, optionKey);
  }, [saveAnswer]);

  const handleFlag = useCallback(async (questionId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    try {
      await apiPut(`/participant/sessions/${sessionId}/flag/${questionId}`, {});
    } catch {
      // silent
    }
  }, [sessionId]);

  const handleSubmit = useCallback(() => {
    const questions = data?.questions ?? [];
    const unanswered = questions.length - Object.keys(answers).length;
    const flaggedCount = flags.size;

    const message = [
      unanswered > 0 ? `${unanswered} soal belum dijawab.` : 'Semua soal sudah dijawab.',
      flaggedCount > 0 ? `${flaggedCount} soal ditandai untuk ditinjau.` : '',
      '\nYakin ingin menyelesaikan tryout?',
    ].filter(Boolean).join('\n');

    Alert.alert('Selesaikan Tryout', message, [
      { text: 'Kembali', style: 'cancel' },
      {
        text: 'Selesaikan',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            // Re-send ALL locally-selected answers before submitting.
            // This guarantees the server state matches local state, even if
            // any background save-as-you-go calls were still in-flight or failed.
            // flushAllAnswers throws if any PUT fails, blocking submit.
            await flushAllAnswers(answers);
            await apiPost(`/participant/sessions/${sessionId}/submit`);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            qc.invalidateQueries({ queryKey: ['results'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            router.replace(`/result/${sessionId}`);
          } catch (e) {
            Alert.alert('Gagal Menyelesaikan', (e as Error).message);
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }, [data, answers, flags, sessionId, qc, flushAllAnswers]);

  const s = styles(colors, insets);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Memuat soal...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={s.center}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={s.errorText}>Gagal memuat sesi</Text>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const questions = data.questions ?? [];
  const question: Question | undefined = questions[currentIndex];
  if (!question) return null;

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? answeredCount / questions.length : 0;
  const isFlagged = flags.has(question.id);
  // Answer stored as option KEY ("A", "B", …)
  const selectedKey = answers[question.id];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Pressable onPress={() => {
          Alert.alert('Keluar Sesi', 'Jawaban yang sudah dipilih tersimpan. Yakin keluar?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', onPress: () => router.back() },
          ]);
        }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Pressable onPress={() => setShowNavigator(!showNavigator)} style={s.navBtn}>
          <Text style={s.navBtnText}>{currentIndex + 1}/{questions.length}</Text>
          <Feather name="grid" size={16} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => handleFlag(question.id)}>
          <Feather name="bookmark" size={22} color={isFlagged ? colors.accent : colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      {showNavigator ? (
        <View style={s.navigator}>
          <Text style={s.navigatorTitle}>Navigator Soal</Text>
          <FlatList
            data={questions}
            numColumns={7}
            keyExtractor={(q) => q.id}
            renderItem={({ item: q, index }) => {
              const ans = answers[q.id];
              const flagged = flags.has(q.id);
              const isCurrent = index === currentIndex;
              return (
                <Pressable
                  onPress={() => { setCurrentIndex(index); setShowNavigator(false); }}
                  style={[
                    s.navCell,
                    ans ? s.navAnswered : s.navUnanswered,
                    flagged && s.navFlagged,
                    isCurrent && s.navCurrent,
                  ]}
                >
                  <Text style={[s.navCellText, (ans || isCurrent) && s.navCellTextDark]}>
                    {index + 1}
                  </Text>
                </Pressable>
              );
            }}
          />
          <View style={s.navLegend}>
            <View style={s.legendRow}><View style={[s.legendDot, s.navAnswered]} /><Text style={s.legendText}>Dijawab</Text></View>
            <View style={s.legendRow}><View style={[s.legendDot, s.navFlagged]} /><Text style={s.legendText}>Ditandai</Text></View>
            <View style={s.legendRow}><View style={[s.legendDot, s.navUnanswered]} /><Text style={s.legendText}>Belum dijawab</Text></View>
          </View>
          <Pressable
            style={({ pressed }) => [s.closeNavBtn, pressed && s.pressed]}
            onPress={() => setShowNavigator(false)}
          >
            <Text style={s.closeNavText}>Tutup</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.questionContent} showsVerticalScrollIndicator={false}>
          <View style={s.categoryChip}>
            <Text style={s.categoryText}>{question.categoryId ?? question.category ?? ''}</Text>
          </View>

          <Text style={s.questionText}>{questionText(question)}</Text>

          <View style={s.optionsContainer}>
            {question.options.map((opt, i) => {
              // opt.key is the canonical answer identifier ("A", "B", …)
              const isSelected = selectedKey === opt.key;
              const label = opt.key || OPTION_LABELS[i] || String.fromCharCode(65 + i);
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    s.option,
                    isSelected && s.optionSelected,
                    pressed && !isSelected && s.optionHover,
                  ]}
                  onPress={() => handleSelectAnswer(question.id, opt.key)}
                >
                  <View style={[s.optionLabel, isSelected && s.optionLabelSelected]}>
                    <Text style={[s.optionLabelText, isSelected && s.optionLabelTextSelected]}>
                      {label}
                    </Text>
                  </View>
                  <Text style={[s.optionText, isSelected && s.optionTextSelected]}>
                    {opt.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.spacer} />
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      {!showNavigator && (
        <View style={[s.bottomNav, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
          <Pressable
            style={({ pressed }) => [s.navArrow, pressed && s.pressed, currentIndex === 0 && s.disabled]}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <Feather name="arrow-left" size={20} color={currentIndex === 0 ? colors.mutedForeground : colors.foreground} />
          </Pressable>

          {currentIndex === questions.length - 1 ? (
            <Pressable
              style={({ pressed }) => [s.submitBtn, pressed && s.pressed, submitting && s.disabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitText}>Selesaikan</Text>}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [s.navArrow, pressed && s.pressed]}
              onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              <Feather name="arrow-right" size={20} color={colors.foreground} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background },
    loadingText: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    errorText: { fontSize: 15, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    backBtn: { backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { fontSize: 14, color: colors.foreground, fontFamily: 'Inter_500Medium' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    navBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    progressTrack: { height: 3, backgroundColor: colors.muted },
    progressFill: { height: 3, backgroundColor: colors.accent },
    questionContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
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
    optionsContainer: { gap: 10 },
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
    optionLabel: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    optionLabelSelected: { backgroundColor: colors.primary },
    optionLabelText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.mutedForeground },
    optionLabelTextSelected: { color: '#fff' },
    optionText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, lineHeight: 22 },
    optionTextSelected: { color: colors.primary, fontFamily: 'Inter_500Medium' },
    spacer: { height: 80 },
    bottomNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    navArrow: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtn: {
      flex: 1,
      marginHorizontal: 16,
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.4 },
    navigator: { flex: 1, padding: 20 },
    navigatorTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 16 },
    navCell: { width: 38, height: 38, margin: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    navAnswered: { backgroundColor: colors.primary },
    navUnanswered: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    navFlagged: { backgroundColor: 'rgba(245,159,10,0.3)', borderWidth: 1.5, borderColor: colors.accent },
    navCurrent: { borderWidth: 2, borderColor: colors.primary },
    navCellText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.mutedForeground },
    navCellTextDark: { color: '#fff' },
    navLegend: { flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 20 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 14, height: 14, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    closeNavBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    closeNavText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  });
