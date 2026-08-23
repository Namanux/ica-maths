export type QuestionType = "multiple_choice" | "free_response";

export interface AnswerOption {
  label: "A" | "B" | "C" | "D";
  text?: string;
  imageUrl?: string;
}

export interface QuestionTable {
  headers: string[];
  rows: string[][];
}

export interface Question {
  id: string;
  number: number;
  type: QuestionType;
  prompt: string;
  imageUrl?: string;
  optionsImageUrl?: string;
  table?: QuestionTable;
  options?: AnswerOption[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string;
  topic?: string;
}

export interface Paper {
  id: string;
  subject: string;
  yearLevel: number;
  paperCode: string;
  title: string;
  year: number;
  timeLimitMinutes: number;
  questions: Question[];
}

export interface PaperSummary {
  id: string;
  subject: string;
  yearLevel: number;
  paperCode: string;
  title: string;
  year: number;
  timeLimitMinutes: number;
  questionCount: number;
}

export interface QuestionResult {
  questionId: string;
  questionNumber: number;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  topic?: string;
  timeSpentSeconds?: number;
}

export interface CategoryBreakdown {
  topic: string;
  correct: number;
  total: number;
}

export interface AttemptResult {
  id: string;
  paperId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
  questionResults: QuestionResult[];
  categoryBreakdown: CategoryBreakdown[];
  completedAt: string;
}
