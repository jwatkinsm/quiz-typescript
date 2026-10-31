import type { Question, QuestionKind, Submission } from "./types.js";

export const MAX_QUESTIONS = 50;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function createId(): string {
  return crypto.randomUUID();
}

export function makeQuestion(kind: QuestionKind = "choice"): Question {
  return {
    id: createId(),
    prompt: "",
    kind,
    options: kind === "text" ? [] : ["Option 1", "Option 2"],
    correctOptionIndex: null,
    correctOptionIndexes: [],
    required: true,
  };
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function downloadSubmission(submission: Submission): void {
  const { form, answers, score, scoredQuestions, checkboxScores } = submission;
  const overallPercentage =
    scoredQuestions > 0 ? Math.round((score / scoredQuestions) * 100) : 0;
  const lines = [
    form.title,
    "=".repeat(Math.min(Math.max(form.title.length, 8), 72)),
    `Type: ${form.kind === "quiz" ? "Quiz" : "Survey"}`,
    `Submitted: ${new Date().toLocaleString()}`,
    "",
    ...answers.flatMap((answer, index) => [
      `${index + 1}. ${answer.question}`,
      `   ${answer.answer || "(No answer)"}`,
      "",
    ]),
  ];
  if (form.kind === "quiz" && scoredQuestions > 0) {
    lines.push(
      `Score: ${Number(score.toFixed(2))}/${scoredQuestions} points (${overallPercentage}% overall)`,
    );
    if (checkboxScores.length > 0) {
      lines.push(
        "",
        "Checkbox question scores:",
        ...checkboxScores.map(
          ({ question, percentage }) =>
            `- ${question}: ${Number(percentage.toFixed(1))}%`,
        ),
      );
    }
  }

  const blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename =
    form.title
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "quiz-response";

  anchor.href = url;
  anchor.download = `${filename}-responses.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
