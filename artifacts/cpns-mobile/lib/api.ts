/**
 * API client for CPNS Tryout backend.
 * Uses the base URL from EXPO_PUBLIC_DOMAIN env var.
 * React Native's native HTTP stack handles cookies automatically on iOS.
 */

export const API_URL: string = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'http://localhost:3000/api';

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Canonical types matching backend response shapes ───────────────────────

export interface UserSubscription {
  planId: string;
  planName: string;
  status: string;
  expiresAt: string;
  daysLeft: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  subscription?: UserSubscription | null;
}

/** GET /participant/dashboard → { dashboard: DashboardData } */
export interface DashboardData {
  totalTryoutsDone: number;
  averageScore: number | null;
  rank: number | null;
  subscriptionName?: string | null;
  subscriptionDaysLeft?: number;
}

/** Tryout bundle from GET /participant/tryouts */
export interface TryoutBundle {
  id: string;
  title: string;
  description?: string;
  isPublished?: boolean;
  isPremium?: boolean;
  totalQuestions?: number;
  duration?: number;
  sections?: TryoutSection[];
}

export interface TryoutSection {
  category: string;
  questionCount: number;
  passingScore?: number;
}

/**
 * Session object.
 * - answers: { [questionId]: answerKey }  (key = "A", "B", …)
 * - flagged: questionId[]
 */
export interface TryoutSession {
  id: string;
  tryoutId: string | number;
  status: 'in_progress' | 'completed';
  answers: Record<string, string>;
  flagged: string[];
  timeRemaining?: number;
}

/**
 * Question option with key/text as returned by backend.
 * key = "A" | "B" | "C" | "D" | "E"
 */
export interface QuestionOption {
  key: string;
  text: string;
  weight?: number;
}

/**
 * Question as returned from GET /participant/sessions/:sessionId
 * and GET /participant/practice/bundles/:id/questions
 */
export interface Question {
  id: string;
  /** Primary content field (tryout questions use `text`, review uses `content`) */
  text?: string;
  content?: string;
  categoryId?: string;
  category?: string;
  sectionName?: string;
  options: QuestionOption[];
  correctAnswer?: string;  // option key
  explanation?: string;
}

/**
 * Question as returned from GET /participant/tryout-review/:sessionId
 * (includes user answer and isCorrect)
 */
export interface ReviewQuestion extends Question {
  userAnswer?: string | null;  // option key
  isCorrect?: boolean | null;
  skipped?: boolean;
}

/** GET /participant/sessions/:sessionId → SessionWithQuestions */
export interface SessionWithQuestions {
  session: TryoutSession;
  questions: Question[];
}

/**
 * GET /participant/results/:sessionId → { result: TryoutResult }
 */
export interface TryoutResult {
  id?: number;
  sessionId?: string;
  tryoutId?: string;
  tryoutName?: string;
  score: { TWK: number; TIU: number; TKP: number; total: number };
  passed: boolean;
  rank?: number;
  totalParticipants?: number;
  completedAt?: string;
}

/** POST /participant/tryouts/:id/sessions → { session: ... } */
export interface StartSessionResponse {
  session: { id: string; [key: string]: unknown };
}

/** Practice bundle from GET /participant/practice/bundles */
export interface PracticeBundle {
  id: string;
  /** Backend returns 'name' (not 'title') */
  name: string;
  category?: string;
  questionCount?: number;
  totalQuestions?: number;
}

/** POST /participant/practice/bundles/:id/submit → { correctCount, totalQuestions } */
export interface PracticeSubmitResult {
  correctCount: number;
  totalQuestions: number;
}

/** GET /participant/tryout-review/:sessionId */
export interface TryoutReview {
  tryout?: { name: string; passingGrade?: number };
  result?: {
    twkScore?: number;
    tiuScore?: number;
    tkpScore?: number;
    totalScore?: number;
    passed?: boolean;
  };
  questions: ReviewQuestion[];
}

/** GET /participant/results (list) */
export interface TryoutResultSummary {
  sessionId: string;
  tryoutId: string;
  tryoutName?: string;
  score?: { TWK: number; TIU: number; TKP: number; total: number };
  passed?: boolean;
  completedAt?: string;
}

/** Helper: get display text from a question */
export function questionText(q: Question): string {
  return q.text ?? q.content ?? '';
}
