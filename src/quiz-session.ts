import type { Question, ResponseAnswer, Submission, QuizForm } from "./types.js";
import { MAX_QUESTIONS } from "./utils.js";

// --- Submitted option parsing ---
function getSelectedOptionIndexes(question: Question, data: FormData): number[] {
  // FormData may contain duplicate or malformed values; only retain valid option indexes.
  return [
    ...new Set(
      data
        .getAll(question.id)
        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
        .map(Number)
        .filter(
          (optionIndex) =>
            Number.isInteger(optionIndex) &&
            optionIndex >= 0 &&
            optionIndex < question.options.length,
        ),
    ),
  ].sort((first, second) => first - second);
}

function getMatchingAnswerIndexes(question: Question, data: FormData): Array<number | null> {
  // Matching controls use a separate field per prompt; null represents an unanswered prompt.
  return question.matchingPairs.map((_, pairIndex) => {
    const value = data.get(`${question.id}-match-${pairIndex}`);
    if (typeof value !== "string" || value.trim() === "") return null;

    const answerIndex = Number(value);
    return Number.isInteger(answerIndex) &&
      answerIndex >= 0 &&
      answerIndex < question.matchingPairs.length
      ? answerIndex
      : null;
  });
}

// --- Response collection ---
// Normalize every question type to one readable answer string for display and download.
function collectAnswersRecursively(
  questions: Question[],
  data: FormData,
  index = 0,
  answers: ResponseAnswer[] = [],
): ResponseAnswer[] {
  if (index >= questions.length) return answers;

  const question = questions[index];
  const rawAnswer = data.get(question.id);
  const answer =
    question.kind === "choice" && rawAnswer !== null
      ? question.options[Number(rawAnswer)] ?? ""
      : question.kind === "checkbox"
        ? getSelectedOptionIndexes(question, data)
            .map((optionIndex) => question.options[optionIndex])
            .join(", ")
        : question.kind === "matching"
          ? getMatchingAnswerIndexes(question, data)
              .map((answerIndex, pairIndex) => {
                const pair = question.matchingPairs[pairIndex];
                const answer =
                  answerIndex === null
                    ? "(No answer)"
                    : question.matchingPairs[answerIndex].answer;
                return `${pair.prompt} → ${answer}`;
              })
              .join("; ")
          : typeof rawAnswer === "string"
            ? rawAnswer.trim()
            : "";

  answers.push({ question: question.prompt, answer });
  return collectAnswersRecursively(questions, data, index + 1, answers);
}

// --- Submission and scoring ---
// Owns one response's answer collection and scoring lifecycle.
export class QuizSession {
  constructor(private readonly form: QuizForm) {}

  async submit(data: FormData): Promise<Submission> {
    if (this.form.questions.length > MAX_QUESTIONS) {
      throw new Error(`Forms can contain at most ${MAX_QUESTIONS} questions.`);
    }

    // Let the browser paint the disabled submit state before doing submission work.
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const answers = collectAnswersRecursively(this.form.questions, data);
    // Surveys and free-text questions are included in answers but are never scored.
    const scoredQuestions =
      this.form.kind === "quiz"
        ? this.form.questions.filter(
            (question) =>
              (question.kind === "choice" && question.correctOptionIndex !== null) ||
              (question.kind === "checkbox" && question.correctOptionIndexes.length > 0) ||
              (question.kind === "matching" && question.matchingPairs.length > 0),
          )
        : [];
    const checkboxScores: Array<{ question: string; percentage: number }> = [];
    const matchingScores: Array<{ question: string; percentage: number }> = [];
    const score = scoredQuestions.reduce((total, question) => {
      if (question.kind === "choice") {
        const answer = answers[this.form.questions.indexOf(question)]?.answer;
        return total + (answer === question.options[question.correctOptionIndex ?? -1] ? 1 : 0);
      }

      if (question.kind === "matching") {
        const selectedIndexes = getMatchingAnswerIndexes(question, data);
        // Each prompt earns an equal share of the question's point.
        const correctMatches = selectedIndexes.filter(
          (answerIndex, pairIndex) => answerIndex === pairIndex,
        ).length;
        const earnedPoints = correctMatches / question.matchingPairs.length;
        matchingScores.push({
          question: question.prompt,
          percentage: earnedPoints * 100,
        });
        return total + earnedPoints;
      }

      if (question.kind !== "checkbox") return total;
      const selectedIndexes = getSelectedOptionIndexes(question, data);
      const correct = new Set(question.correctOptionIndexes);
      const correctSelections = selectedIndexes.filter((optionIndex) => correct.has(optionIndex)).length;
      const incorrectSelections = selectedIndexes.length - correctSelections;
      // Reward correct picks, penalize wrong picks, and clamp credit to the range 0–1.
      const earnedPoints = Math.max(
        0,
        Math.min(1, (correctSelections - incorrectSelections) / correct.size),
      );
      checkboxScores.push({
        question: question.prompt,
        percentage: (earnedPoints * 100),
      });
      return total + earnedPoints;
    }, 0);

    return {
      form: this.form,
      answers,
      score,
      scoredQuestions: scoredQuestions.length,
      checkboxScores,
      matchingScores,
    };
  }
}
