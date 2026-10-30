import type { Question, ResponseAnswer, Submission, QuizForm } from "./types.js";
import { MAX_QUESTIONS } from "./utils.js";

// Collect one response per question; the index is the recursion's stopping condition.
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
      : typeof rawAnswer === "string"
        ? rawAnswer.trim()
        : "";

  answers.push({ question: question.prompt, answer });
  return collectAnswersRecursively(questions, data, index + 1, answers);
}

// Owns one response's answer collection and scoring lifecycle.
export class QuizSession {
  constructor(private readonly form: QuizForm) {}

  async submit(data: FormData): Promise<Submission> {
    if (this.form.questions.length > MAX_QUESTIONS) {
      throw new Error(`Forms can contain at most ${MAX_QUESTIONS} questions.`);
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const answers = collectAnswersRecursively(this.form.questions, data);
    // Surveys and free-text questions are kept in the response but do not contribute to quiz scores.
    const scoredQuestions =
      this.form.kind === "quiz"
        ? this.form.questions.filter(
            (question) => question.kind === "choice" && question.correctOptionIndex !== null,
          )
        : [];
    const score = scoredQuestions.reduce((total, question) => {
      const answer = answers[this.form.questions.indexOf(question)]?.answer;
      return total + (answer === question.options[question.correctOptionIndex ?? -1] ? 1 : 0);
    }, 0);

    return {
      form: this.form,
      answers,
      score,
      scoredQuestions: scoredQuestions.length,
    };
  }
}
