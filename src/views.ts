import type { Question, QuizForm, Submission } from "./types.js";
import { escapeHtml, formatDate, MAX_QUESTIONS } from "./utils.js";

function renderHeader(): string {
  return `
    <header class="topbar">
      <a class="brand" href="#" data-action="home" aria-label="Little Quiz Studio home">
        <span class="brand__mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
        <span>little quiz <span class="brand__studio">studio</span></span>
      </a>
      <span class="topbar__note"><span class="topbar__sparkle" aria-hidden="true">✳</span> Make something worth answering</span>
    </header>
  `;
}

function renderNotice(notice: string, storageError: string): string {
  if (storageError) {
    return `<p class="notice notice--error" role="alert">Your forms could not be saved or loaded from this browser: ${escapeHtml(storageError)}</p>`;
  }
  if (notice) {
    return `<p class="notice" role="status">${escapeHtml(notice)}</p>`;
  }
  return "";
}

export function renderDashboard(
  forms: QuizForm[],
  notice: string,
  storageError: string,
): string {
  const cards = forms.length
    ? `<div class="form-grid">${forms
        .map(
          (form) => `
            <article class="form-card">
              <div class="form-card__top">
                <span class="form-kind form-kind--${form.kind}">${form.kind === "quiz" ? "Quiz" : "Survey"}</span>
                <button class="icon-button" type="button" data-action="delete" data-id="${escapeHtml(form.id)}" aria-label="Delete ${escapeHtml(form.title)}">×</button>
              </div>
              <h2>${escapeHtml(form.title || "Untitled form")}</h2>
              <p class="form-card__description">${escapeHtml(form.description || "No description yet.")}</p>
              <div class="form-card__meta">${form.questions.length} question${form.questions.length === 1 ? "" : "s"} <span>·</span> Edited ${escapeHtml(formatDate(form.updatedAt))}</div>
              <div class="form-card__actions">
                <button class="secondary-button" type="button" data-action="edit" data-id="${escapeHtml(form.id)}">Edit</button>
                <button class="primary-button" type="button" data-action="take" data-id="${escapeHtml(form.id)}">Take form <span aria-hidden="true">→</span></button>
              </div>
            </article>
          `,
        )
        .join("")}</div>`
    : `
      <section class="empty-state">
        <span class="empty-state__icon" aria-hidden="true">✳</span>
        <h2>Your next great question starts here.</h2>
        <p>Create a quiz with scored multiple-choice answers or a survey to collect responses.</p>
        <button class="primary-button" type="button" data-action="new-quiz">Create your first form <span aria-hidden="true">→</span></button>
      </section>
    `;

  return `
    <main class="page-shell">
      ${renderHeader()}
      <section class="studio-content">
        ${renderNotice(notice, storageError)}
        <div class="dashboard-heading">
          <div>
            <p class="eyebrow"><span class="eyebrow__dot"></span> YOUR WORKSPACE</p>
            <h1>Good questions<br /><em>make good things happen.</em></h1>
            <p class="dashboard-heading__copy">Design a quiz or survey, then fill it in here yourself or hand this browser to a respondent.</p>
          </div>
          <div class="create-actions">
            <button class="secondary-button" type="button" data-action="new-survey"><span aria-hidden="true">＋</span> New survey</button>
            <button class="primary-button" type="button" data-action="new-quiz"><span aria-hidden="true">＋</span> New quiz</button>
          </div>
        </div>
        <div class="section-heading"><h2>Your forms</h2><span>${forms.length} saved</span></div>
        ${cards}
      </section>
      <footer class="page-footer"><span>Made for the joy of knowing.</span><span>SAVED IN THIS BROWSER <span aria-hidden="true">✳</span></span></footer>
    </main>
  `;
}

function renderQuestionEditor(
  question: Question,
  index: number,
  draft: QuizForm,
): string {
  const choiceOptions =
    question.kind === "choice"
      ? `
        <div class="editor-options">
          <div class="editor-options__heading">
            <span>Answer options</span>
            ${draft.kind === "quiz" ? "<span>Correct answer</span>" : ""}
          </div>
          ${question.options
            .map(
              (option, optionIndex) => `
                <div class="option-editor">
                  <span class="option-editor__letter">${String.fromCharCode(65 + optionIndex)}</span>
                  <input type="text" maxlength="160" value="${escapeHtml(option)}" aria-label="Option ${optionIndex + 1}" data-question="${escapeHtml(question.id)}" data-option="${optionIndex}" />
                  ${draft.kind === "quiz" ? `<input class="correct-radio" type="radio" name="correct-${escapeHtml(question.id)}" value="${optionIndex}" aria-label="Mark option ${optionIndex + 1} as correct" ${question.correctOptionIndex === optionIndex ? "checked" : ""} data-question="${escapeHtml(question.id)}" data-correct />` : ""}
                  ${question.options.length > 2 ? `<button class="icon-button option-remove" type="button" data-action="remove-option" data-question="${escapeHtml(question.id)}" data-option="${optionIndex}" aria-label="Remove option ${optionIndex + 1}">×</button>` : ""}
                </div>
              `,
            )
            .join("")}
          <button class="text-button" type="button" data-action="add-option" data-question="${escapeHtml(question.id)}" ${question.options.length >= 8 ? "disabled" : ""}>＋ Add option</button>
        </div>
      `
      : `<p class="field-help">Respondents will answer with a free-text response. Text answers aren’t scored.</p>`;

  return `
    <article class="question-editor">
      <div class="question-editor__top">
        <span class="question-editor__number">QUESTION ${String(index + 1).padStart(2, "0")}</span>
        <button class="text-button text-button--danger" type="button" data-action="remove-question" data-question="${escapeHtml(question.id)}" ${draft.questions.length === 1 ? "disabled" : ""}>Remove</button>
      </div>
      <label class="field-label">Question text
        <input type="text" maxlength="240" placeholder="Write your question…" value="${escapeHtml(question.prompt)}" data-question="${escapeHtml(question.id)}" data-question-field="prompt" />
      </label>
      <div class="question-editor__settings">
        <label class="field-label">Answer type
          <select data-question="${escapeHtml(question.id)}" data-question-field="kind">
            <option value="choice" ${question.kind === "choice" ? "selected" : ""}>Multiple choice</option>
            <option value="text" ${question.kind === "text" ? "selected" : ""}>Text input</option>
          </select>
        </label>
        <label class="checkbox-label"><input type="checkbox" data-question="${escapeHtml(question.id)}" data-question-field="required" ${question.required ? "checked" : ""} /> Required</label>
      </div>
      ${choiceOptions}
    </article>
  `;
}

export function renderEditor(
  draft: QuizForm,
  forms: QuizForm[],
  notice: string,
  storageError: string,
): string {
  return `
    <main class="page-shell">
      ${renderHeader()}
      <section class="studio-content studio-content--narrow">
        ${renderNotice(notice, storageError)}
        <button class="back-link" type="button" data-action="home">← All forms</button>
        <div class="editor-heading">
          <div>
            <p class="eyebrow"><span class="eyebrow__dot"></span> FORM BUILDER</p>
            <h1>${forms.some((form) => form.id === draft.id) ? "Make it your own." : "Start with a question."}</h1>
          </div>
          <span class="form-kind form-kind--${draft.kind}">${draft.kind === "quiz" ? "Quiz" : "Survey"}</span>
        </div>
        <div class="form-details">
          <label class="field-label">Form title
            <input type="text" maxlength="100" placeholder="e.g. The big team quiz" value="${escapeHtml(draft.title)}" data-form-field="title" />
          </label>
          <label class="field-label">Description <span class="optional-label">Optional</span>
            <textarea maxlength="500" rows="3" placeholder="Tell people what this is about…" data-form-field="description">${escapeHtml(draft.description)}</textarea>
          </label>
        </div>
        <div class="section-heading editor-questions-heading"><h2>Questions</h2><span>${draft.questions.length} so far</span></div>
        <div class="question-list">${draft.questions.map((question, index) => renderQuestionEditor(question, index, draft)).join("")}</div>
        <button class="add-question-button" type="button" data-action="add-question" ${draft.questions.length >= MAX_QUESTIONS ? "disabled" : ""}>＋ Add a question</button>
        <div class="editor-footer">
          <p>${draft.kind === "quiz" ? "Quiz scores count multiple-choice questions only." : "Surveys collect responses without scoring."}<br />Your forms are saved in this browser.</p>
          <button class="primary-button" type="button" data-action="save">Save form <span aria-hidden="true">→</span></button>
        </div>
      </section>
      <footer class="page-footer"><span>Made for the joy of knowing.</span><span>DESIGNED BY YOU <span aria-hidden="true">✳</span></span></footer>
    </main>
  `;
}

export function renderTake(form: QuizForm, notice: string, storageError: string): string {
  const questionMarkup = form.questions
    .map((question, index) => {
      const control =
        question.kind === "choice"
          ? `<div class="take-options">${question.options
              .map(
                (option, optionIndex) => `
                  <label class="take-option">
                    <input type="radio" name="${escapeHtml(question.id)}" value="${optionIndex}" ${question.required ? "required" : ""} />
                    <span class="take-option__letter">${String.fromCharCode(65 + optionIndex)}</span>
                    <span>${escapeHtml(option)}</span>
                  </label>
                `,
              )
              .join("")}</div>`
          : `<textarea name="${escapeHtml(question.id)}" rows="3" maxlength="2000" placeholder="Type your answer…" ${question.required ? "required" : ""}></textarea>`;

      return `
        <fieldset class="take-question">
          <legend><span class="take-question__number">${String(index + 1).padStart(2, "0")}</span>${escapeHtml(question.prompt)}${question.required ? '<span class="required-mark" aria-label="required">*</span>' : '<span class="optional-label">Optional</span>'}</legend>
          ${control}
        </fieldset>
      `;
    })
    .join("");

  return `
    <main class="page-shell">
      ${renderHeader()}
      <section class="studio-content studio-content--narrow take-content">
        ${renderNotice(notice, storageError)}
        <button class="back-link" type="button" data-action="home">← Back to forms</button>
        <div class="take-heading">
          <span class="form-kind form-kind--${form.kind}">${form.kind === "quiz" ? "Quiz" : "Survey"}</span>
          <h1>${escapeHtml(form.title)}</h1>
          ${form.description ? `<p>${escapeHtml(form.description)}</p>` : ""}
          <span class="take-heading__count">${form.questions.length} question${form.questions.length === 1 ? "" : "s"}</span>
        </div>
        <form id="response-form">
          ${questionMarkup}
          <div class="take-footer">
            <p>Your answers will be saved as a downloadable text file.</p>
            <p class="submission-status" id="submission-status" role="status" aria-live="polite"></p>
            <button class="primary-button" type="submit">Submit answers <span aria-hidden="true">→</span></button>
          </div>
        </form>
      </section>
      <footer class="page-footer"><span>Made for the joy of knowing.</span><span>TAKE YOUR TIME <span aria-hidden="true">✳</span></span></footer>
    </main>
  `;
}

export function renderResults(submission: Submission): string {
  const { form, score, scoredQuestions } = submission;
  const hasScore = form.kind === "quiz" && scoredQuestions > 0;

  return `
    <main class="page-shell">
      ${renderHeader()}
      <section class="results-card results-card--studio" aria-labelledby="results-title">
        <div class="results-card__confetti" aria-hidden="true"><span>✳</span><span>✦</span><span>✳</span><span>✦</span></div>
        <p class="eyebrow"><span class="eyebrow__dot"></span> RESPONSE COMPLETE</p>
        ${hasScore ? `<div class="score-circle"><span class="score-circle__value">${score}</span><span class="score-circle__divider">/</span><span class="score-circle__total">${scoredQuestions}</span></div>` : '<div class="results-check" aria-hidden="true">✓</div>'}
        <h1 id="results-title">${hasScore ? "Your quiz is complete!" : "Thank you for sharing."}</h1>
        <p class="results-card__message">${hasScore ? `You got ${score} out of ${scoredQuestions} scored question${scoredQuestions === 1 ? "" : "s"} right.` : "Your answers are ready to download."}</p>
        <div class="results-card__rule"></div>
        <p class="results-card__fact"><span aria-hidden="true">✦</span> Answers are downloaded to a plain text file on your device.</p>
        <div class="results-actions">
          <button class="primary-button" type="button" data-action="download">Download answers (.txt) <span aria-hidden="true">↓</span></button>
          <button class="secondary-button" type="button" data-action="home">Back to forms</button>
        </div>
      </section>
      <footer class="page-footer"><span>Made for the joy of knowing.</span><span>THANKS FOR TAKING PART <span aria-hidden="true">✳</span></span></footer>
    </main>
  `;
}
