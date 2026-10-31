// --- Form and question definitions ---
export type FormKind = "quiz" | "survey";
export type QuestionKind = "choice" | "checkbox" | "matching" | "text";
export type View = "dashboard" | "editor" | "take" | "results";

// A matching question pairs each prompt with the answer at the same index.
export type MatchingPair = {
  prompt: string;
  answer: string;
};

export type Question = {
  id: string;
  prompt: string;
  kind: QuestionKind;
  options: string[];
  // Single-choice and checkbox questions use separate correct-answer fields.
  correctOptionIndex: number | null;
  correctOptionIndexes: number[];
  matchingPairs: MatchingPair[];
  required: boolean;
};

export type QuizForm = {
  id: string;
  title: string;
  description: string;
  kind: FormKind;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
};

// --- Respondent answers and scoring results ---
export type ResponseAnswer = {
  question: string;
  answer: string;
};

export type Submission = {
  form: QuizForm;
  answers: ResponseAnswer[];
  // Scores may be fractional because checkbox and matching questions award partial credit.
  score: number;
  scoredQuestions: number;
  // Per-question percentages are shown separately on the results screen.
  checkboxScores: Array<{ question: string; percentage: number }>;
  matchingScores: Array<{ question: string; percentage: number }>;
};
