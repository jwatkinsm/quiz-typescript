import "./style.css";
import type { FormKind, QuizForm, Submission, View } from "./types.js";
import { QuizSession } from "./quiz-session.js";
import { readForms, saveForms } from "./storage.js";
import { createId, downloadSubmission, makeQuestion, MAX_QUESTIONS } from "./utils.js";
import { renderDashboard, renderEditor, renderResults, renderTake } from "./views.js";

// App state
const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("The app root element could not be found.");
}

const app = root;
// Keep the current screen and its working data here; view functions only render markup.
let forms: QuizForm[] = [];
let currentView: View = "dashboard";
let draft: QuizForm | null = null;
let activeForm: QuizForm | null = null;
let lastSubmission: Submission | null = null;
let storageError = "";
let notice = "";

// View rendering and respondent submission
function render(): void {
  // Re-rendering replaces the form element, so the respondent submit handler is rebound each time.
  if (currentView === "editor" && draft) {
    app.innerHTML = renderEditor(draft, forms, notice, storageError);
  } else if (currentView === "take" && activeForm) {
    app.innerHTML = renderTake(activeForm, notice, storageError);
    bindResponseForm(activeForm);
  } else if (currentView === "results" && lastSubmission) {
    app.innerHTML = renderResults(lastSubmission);
  } else {
    app.innerHTML = renderDashboard(forms, notice, storageError);
  }
}

function bindResponseForm(form: QuizForm): void {
  app.querySelector<HTMLFormElement>("#response-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!(formElement instanceof HTMLFormElement)) return;

    const submitButton = formElement.querySelector<HTMLButtonElement>('[type="submit"]');
    const status = app.querySelector<HTMLParagraphElement>("#submission-status");
    if (!submitButton || !status) {
      throw new Error("The submission controls are unavailable.");
    }

    status.textContent = "";
    const unansweredRequiredCheckbox = form.questions.find(
      (question) =>
        question.kind === "checkbox" &&
        question.required &&
        new FormData(formElement).getAll(question.id).length === 0,
    );
    if (unansweredRequiredCheckbox) {
      status.textContent = `Select at least one option for: ${unansweredRequiredCheckbox.prompt}`;
      formElement
        .querySelector<HTMLInputElement>(
          `input[type="checkbox"][name="${CSS.escape(unansweredRequiredCheckbox.id)}"]`,
        )
        ?.focus();
      return;
    }
    if (!formElement.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";

    // Keep the respondent on this screen if processing fails, and restore the submit control.
    try {
      lastSubmission = await new QuizSession(form).submit(new FormData(formElement));
      currentView = "results";
      render();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit answers <span aria-hidden="true">→</span>';
      status.textContent =
        error instanceof Error ? `Could not submit your answers: ${error.message}` : "Could not submit your answers.";
    }
  });
}

// Form creation and validation
function startNewForm(kind: FormKind): void {
  draft = {
    id: createId(),
    title: "",
    description: "",
    kind,
    questions: [makeQuestion()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  currentView = "editor";
  notice = "";
  render();
  app.querySelector<HTMLInputElement>('[data-form-field="title"]')?.focus();
}

function saveDraft(): void {
  if (!draft) return;
  draft.title = draft.title.trim();
  draft.description = draft.description.trim();

  // Validate before writing so incomplete forms are never saved as finished forms.
  if (!draft.title) {
    notice = "Give your form a title before saving.";
    render();
    app.querySelector<HTMLInputElement>('[data-form-field="title"]')?.focus();
    return;
  }
  if (draft.questions.length === 0) {
    notice = "Add at least one question before saving.";
    render();
    return;
  }
  if (draft.questions.length > MAX_QUESTIONS) {
    notice = `Forms can contain at most ${MAX_QUESTIONS} questions.`;
    render();
    return;
  }

  const blankQuestion = draft.questions.findIndex((question) => !question.prompt.trim());
  if (blankQuestion !== -1) {
    notice = `Add question text to question ${blankQuestion + 1}.`;
    render();
    app
      .querySelector<HTMLInputElement>(
        `[data-question="${CSS.escape(draft.questions[blankQuestion].id)}"][data-question-field="prompt"]`,
      )
      ?.focus();
    return;
  }

  for (const [index, question] of draft.questions.entries()) {
    if (question.kind === "text") continue;
    question.options = question.options.map((option) => option.trim());
    if (question.options.length < 2 || question.options.some((option) => !option)) {
      notice = `Question ${index + 1} needs at least two non-empty answer options.`;
      render();
      return;
    }
    if (question.kind === "choice") {
      if (
        draft.kind === "quiz" &&
        (question.correctOptionIndex === null ||
          question.correctOptionIndex < 0 ||
          question.correctOptionIndex >= question.options.length)
      ) {
        notice = `Choose the correct answer for question ${index + 1}.`;
        render();
        return;
      }
      question.correctOptionIndexes = [];
      if (draft.kind === "survey") question.correctOptionIndex = null;
    } else {
      question.correctOptionIndexes = question.correctOptionIndexes.filter(
        (optionIndex) => optionIndex >= 0 && optionIndex < question.options.length,
      );
      if (draft.kind === "quiz" && question.correctOptionIndexes.length === 0) {
        notice = `Choose at least one correct answer for question ${index + 1}.`;
        render();
        return;
      }
      question.correctOptionIndex = null;
    }
  }

  const existingIndex = forms.findIndex((form) => form.id === draft?.id);
  draft.updatedAt = new Date().toISOString();
  if (existingIndex === -1) forms.unshift(draft);
  else forms[existingIndex] = draft;

  const error = saveForms(forms);
  if (error) {
    storageError = error;
    render();
    return;
  }

  storageError = "";
  draft = null;
  currentView = "dashboard";
  notice = "Your form was saved in this browser.";
  render();
}

// Draft input listeners keep form fields synchronized with the in-memory draft.
// Delegated listeners survive view re-renders because they are attached to the stable app root.
app.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (!draft) return;

  const questionId = target.dataset.question;
  const question = questionId
    ? draft.questions.find((item) => item.id === questionId)
    : undefined;
  if (question && target.dataset.questionField === "prompt") {
    question.prompt = target.value;
  } else if (question && target.dataset.option !== undefined) {
    question.options[Number(target.dataset.option)] = target.value;
  } else if (!question && target.dataset.formField === "title") {
    draft.title = target.value;
  } else if (!question && target.dataset.formField === "description") {
    draft.description = target.value;
  }
});

// Question setting controls
app.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  if (!draft) return;

  const question = draft.questions.find((item) => item.id === target.dataset.question);
  if (!question) return;
  if (target instanceof HTMLSelectElement && target.dataset.questionField === "kind") {
    question.kind =
      target.value === "text" || target.value === "checkbox" ? target.value : "choice";
    question.options = question.kind === "text" ? [] : ["Option 1", "Option 2"];
    question.correctOptionIndex = null;
    question.correctOptionIndexes = [];
    render();
  } else if (target instanceof HTMLInputElement && target.dataset.questionField === "required") {
    question.required = target.checked;
  } else if (target instanceof HTMLInputElement && target.hasAttribute("data-correct")) {
    const optionIndex = Number(target.value);
    if (question.kind === "checkbox") {
      if (target.checked && !question.correctOptionIndexes.includes(optionIndex)) {
        question.correctOptionIndexes.push(optionIndex);
      } else if (!target.checked) {
        question.correctOptionIndexes = question.correctOptionIndexes.filter(
          (index) => index !== optionIndex,
        );
      }
    } else {
      question.correctOptionIndex = optionIndex;
    }
  }
});

// App navigation and editor actions
app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  // Views identify actions with data attributes; one handler routes all of their buttons.
  const button = target.closest<HTMLButtonElement>("[data-action]");
  if (!button || button.disabled) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const questionId = button.dataset.question;
  const optionIndex = Number(button.dataset.option);

  if (action === "home") {
    currentView = "dashboard";
    draft = null;
    activeForm = null;
    notice = "";
    render();
  } else if (action === "new-quiz") {
    startNewForm("quiz");
  } else if (action === "new-survey") {
    startNewForm("survey");
  } else if (action === "add-question" && draft && draft.questions.length < MAX_QUESTIONS) {
    draft.questions.push(makeQuestion());
    render();
  } else if (action === "remove-question" && draft && questionId) {
    if (draft.questions.length > 1) {
      draft.questions = draft.questions.filter((question) => question.id !== questionId);
      render();
    }
  } else if (action === "add-option" && draft && questionId) {
    const question = draft.questions.find((item) => item.id === questionId);
    if (question && question.options.length < 8) {
      question.options.push(`Option ${question.options.length + 1}`);
      render();
    }
  } else if (action === "remove-option" && draft && questionId) {
    const question = draft.questions.find((item) => item.id === questionId);
    if (question && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      if (question.correctOptionIndex === optionIndex) question.correctOptionIndex = null;
      else if (question.correctOptionIndex !== null && question.correctOptionIndex > optionIndex) {
        question.correctOptionIndex -= 1;
      }
      question.correctOptionIndexes = question.correctOptionIndexes
        .filter((index) => index !== optionIndex)
        .map((index) => (index > optionIndex ? index - 1 : index));
      render();
    }
  } else if (action === "save") {
    saveDraft();
  } else if (action === "edit" && id) {
    const form = forms.find((item) => item.id === id);
    if (form) {
      draft = structuredClone(form);
      currentView = "editor";
      notice = "";
      render();
    }
  } else if (action === "take" && id) {
    activeForm = forms.find((item) => item.id === id) ?? null;
    if (activeForm) {
      currentView = "take";
      notice = "";
      render();
    }
  } else if (action === "delete" && id) {
    const form = forms.find((item) => item.id === id);
    if (form && window.confirm(`Delete "${form.title || "Untitled form"}"? This cannot be undone.`)) {
      forms = forms.filter((item) => item.id !== id);
      const error = saveForms(forms);
      if (error) storageError = error;
      else {
        storageError = "";
        notice = "Form deleted.";
      }
      render();
    }
  } else if (action === "download" && lastSubmission) {
    downloadSubmission(lastSubmission);
  }
});

// Initialize from browser storage, then show the starting dashboard.
// A storage read can fail (for example, if browser data is malformed); show that failure in the UI.
try {
  forms = readForms();
} catch (error) {
  storageError =
    error instanceof Error ? error.message : "The saved forms could not be read.";
}

render();
