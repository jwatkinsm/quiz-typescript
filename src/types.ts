export type FormKind = "quiz" | "survey";
export type QuestionKind = "choice" | "text";
export type View = "dashboard" | "editor" | "take" | "results";

export type Question = {
  id: string;
  prompt: string;
  kind: QuestionKind;
  options: string[];
  correctOptionIndex: number | null;
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

export type ResponseAnswer = {
  question: string;
  answer: string;
};

export type Submission = {
  form: QuizForm;
  answers: ResponseAnswer[];
  score: number;
  scoredQuestions: number;
};
