import type { Question, QuizForm } from "./types.js";

const STORAGE_KEY = "little-quiz-forms-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseQuestion(value: unknown): Question {
  if (!isRecord(value)) {
    throw new Error("A saved question is not valid.");
  }

  const question = value;
  if (
    typeof question.id !== "string" ||
    typeof question.prompt !== "string" ||
    (question.kind !== "choice" && question.kind !== "text") ||
    !Array.isArray(question.options) ||
    !question.options.every((option) => typeof option === "string") ||
    (question.correctOptionIndex !== null &&
      typeof question.correctOptionIndex !== "number") ||
    typeof question.required !== "boolean"
  ) {
    throw new Error("A saved question is missing required information.");
  }

  return {
    id: question.id,
    prompt: question.prompt,
    kind: question.kind,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    required: question.required,
  };
}

function parseForm(value: unknown): QuizForm {
  if (!isRecord(value)) {
    throw new Error("A saved form is not valid.");
  }

  const form = value;
  if (
    typeof form.id !== "string" ||
    typeof form.title !== "string" ||
    typeof form.description !== "string" ||
    (form.kind !== "quiz" && form.kind !== "survey") ||
    !Array.isArray(form.questions) ||
    typeof form.createdAt !== "string" ||
    typeof form.updatedAt !== "string"
  ) {
    throw new Error("A saved form is missing required information.");
  }

  return {
    id: form.id,
    title: form.title,
    description: form.description,
    kind: form.kind,
    questions: form.questions.map(parseQuestion),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}

export function readForms(): QuizForm[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed)) {
    throw new Error("Saved form data has an unexpected format.");
  }

  return parsed.map(parseForm);
}

export function saveForms(forms: QuizForm[]): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "The browser storage is unavailable.";
  }
}
