import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { apiGet, TryoutReview, ReviewQuestion, questionText } from '@/lib/api';

export default function ReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['review', sessionId],
    queryFn: () => apiGet<TryoutReview>(`/participant/tryout-review/${sessionId}`),
    enabled: !!sessionId,
  });

  const s = styles(colors, insets);

  const renderItem = ({ item: q, index }: { item: ReviewQuestion; index: number }) => {
    const expanded = expandedId === q.id;
    const isCorrect = q.isCorrect;
    const qText = questionText(q);

    return (
      <View style={[s.questionCard, isCorrect === true ? s.correctCard : isCorrect === false ? s.wrongCard : undefined]}>
        <Pressable
          onPress={() => setExpandedId(expanded ? null : q.id)}
          style={s.questionHeader}
        >
          <View style={s.questionHeaderLeft}>
            <View style={[s.statusDot, isCorrect === true ? s.dotCorrect : isCorrect === false ? s.dotWrong : s.dotUnanswered]} />
            <Text style={s.questionNum}>{index + 1}</Text>
          </View>
          <Text style={s.questionSnippet} numberOfLines={expanded ? undefined : 2}>{qText}</Text>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
        </Pressable>

        {expanded && (
          <View style={s.questionBody}>
            {q.options.map((opt) => {
              const isCorrectOpt = opt.key === q.correctAnswer;
              const isUserOpt = opt.key === q.userAnswer;
              return (
                <View
                  key={opt.key}
                  style={[
                    s.optionRow,
                    isCorrectOpt && s.optionCorrect,
                    isUserOpt && !isCorrectOpt && s.optionWrong,
                  ]}
                >
                  <Text style={[s.optLabel, isCorrectOpt ? s.optLabelCorrect : isUserOpt && !isCorrectOpt ? s.optLabelWrong : undefined]}>
                    {opt.key}
                  </Text>
                  <Text style={[s.optText, isCorrectOpt && s.optTextCorrect]}>{opt.text}</Text>
                  {isCorrectOpt && <Feather name="check" size={14} color="#166534" />}
                  {isUserOpt && !isCorrectOpt && <Feather name="x" size={14} color="#991b1b" />}
                </View>
              );
            })}

            {!q.userAnswer && !q.skipped && (
              <View style={s.skippedNote}>
                <Text style={s.skippedText}>Soal tidak dijawab</Text>
              </View>
            )}

            {q.explanation ? (
              <View style={s.explanation}>
                <Feather name="info" size={14} color={colors.primary} />
                <Text style={s.explanationText}>{q.explanation}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

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
        <Text style={s.errorText}>Gagal memuat pembahasan</Text>
      </View>
    );
  }

  const questions = data.questions ?? [];
  const correctCount = questions.filter((q) => q.isCorrect).length;

  return (
    <FlatList
      data={questions}
      keyExtractor={(q) => q.id}
      renderItem={renderItem}
      scrollEnabled={questions.length > 0}
      contentContainerStyle={s.list}
      ListHeaderComponent={
        <View style={s.listHeader}>
          <Text style={s.pageTitle}>Pembahasan</Text>
          <Text style={s.pageStats}>{correctCount} dari {questions.length} soal benar</Text>
          {data.result?.passed != null && (
            <View style={[s.resultBadge, data.result.passed ? s.passYes : s.passNo]}>
              <Text style={[s.resultBadgeText, { color: data.result.passed ? '#166534' : '#991b1b' }]}>
                {data.result.passed ? 'Lulus' : 'Tidak Lulus'}
              </Text>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyText}>Tidak ada soal untuk ditampilkan</Text>
        </View>
      }
    />
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background },
    errorText: { fontSize: 15, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    list: {
      paddingTop: Platform.OS === 'web' ? insets.top + 67 + 8 : 8,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    listHeader: { paddingHorizontal: 4, paddingVertical: 12 },
    pageTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground },
    pageStats: { fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 8 },
    resultBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
    passYes: { backgroundColor: '#dcfce7' },
    passNo: { backgroundColor: '#fee2e2' },
    resultBadgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    questionCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    correctCard: { borderLeftWidth: 4, borderLeftColor: '#22c55e' },
    wrongCard: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
    questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
    questionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    dotCorrect: { backgroundColor: '#22c55e' },
    dotWrong: { backgroundColor: '#ef4444' },
    dotUnanswered: { backgroundColor: colors.mutedForeground },
    questionNum: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, minWidth: 20 },
    questionSnippet: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, lineHeight: 21 },
    questionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.muted,
    },
    optionCorrect: { backgroundColor: '#dcfce7' },
    optionWrong: { backgroundColor: '#fee2e2' },
    optLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, width: 20 },
    optLabelCorrect: { color: '#166534' },
    optLabelWrong: { color: '#991b1b' },
    optText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.foreground, lineHeight: 20 },
    optTextCorrect: { color: '#166534', fontFamily: 'Inter_500Medium' },
    skippedNote: { backgroundColor: colors.muted, borderRadius: 8, padding: 8 },
    skippedText: { fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
    explanation: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: 'rgba(16,57,107,0.06)',
      borderRadius: 10,
      padding: 12,
      marginTop: 4,
    },
    explanationText: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: 'Inter_400Regular', lineHeight: 20 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
  });
