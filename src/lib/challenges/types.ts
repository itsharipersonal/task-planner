export type Difficulty = "easy" | "medium" | "hard";

export type SubmissionType =
  | "video"
  | "audio"
  | "text"
  | "quiz"
  | "code"
  | "image";

export type AttemptStatus =
  | "not_started"
  | "preparing"
  | "active"
  | "submitted"
  | "evaluating"
  | "completed"
  | "failed";

export type QuizQuestion = {
  question: string;
  /** Multiple choice when present; free numeric/text answer otherwise. */
  options?: string[];
  /** Index into options, or the expected free-form answer. */
  answer: number | string;
};

export type ChallengePayload = {
  quiz?: QuizQuestion[];
  article?: string;
};

export type GeneratedChallenge = {
  title: string;
  description: string;
  instructions: string;
  payload?: ChallengePayload;
};

export type Attempt = {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  instructions: string;
  difficulty: Difficulty;
  submissionType: SubmissionType;
  prepSeconds: number;
  workSeconds: number;
  payload: ChallengePayload | null;
  status: AttemptStatus;
  isDaily: boolean;
  aiGenerated: boolean;
  prepEndsAt: number | null;
  workEndsAt: number | null;
  submittedAt: number | null;
  completedAt: number | null;
  score: number | null;
  xpAwarded: number | null;
  createdAt: string;
};

export type SubmissionInput = {
  /** Free text, code, essay, transcript of a recording, or proof description. */
  text?: string;
  /** Answers for quiz-type challenges, aligned with payload.quiz. */
  answers?: (number | string)[];
  /** Optional repository / external link (coding challenges). */
  url?: string;
  /** Recorded media duration in seconds (video / audio challenges). */
  durationSeconds?: number;
};

export type DimensionScore = { dimension: string; score: number; comment: string };

export type Evaluation = {
  overallScore: number;
  dimensionScores: DimensionScore[];
  strengths: string[];
  improvements: string[];
  summary: string;
  nextChallenge: string | null;
  aiGenerated: boolean;
};

export type Feedback = Evaluation & {
  attemptId: string;
  createdAt: string;
};
