# Little Quiz Studio

## Overview

Little Quiz Studio is a browser application for creating, editing, and taking quizzes and surveys. Form authors can write questions, choose multiple-choice, checkbox, matching-pair, or free-text answers, mark correct quiz answers, and decide which questions are required. Quiz submissions are scored for marked multiple-choice, checkbox, and matching-pair questions; checkbox questions award proportional partial credit, with incorrect selections reducing the score, while matching questions award credit for each correctly matched pair. Surveys and free-text answers are not scored. Respondents can download their completed answers as a plain-text file.

I built this project to strengthen my software-engineering skills by applying TypeScript to a complete interactive application. It gave me practice designing typed data models, separating the UI into reusable modules, handling browser storage and form validation, and testing asynchronous application logic.

Forms are stored in the browser's local storage, so they are available in that browser and device only. The app does not currently have a server or shared multi-user storage.

### Software demonstration

A YouTube demonstration video has not been recorded yet. Add the published video link here when it is available. The planned 4–5 minute walkthrough will show the app running, demonstrate creating and taking a quiz or survey, and explain the TypeScript features used in the code.

## Development Environment

- **Editor:** Visual Studio Code
- **Runtime and package manager:** Node.js and npm
- **Build and development server:** Vite
- **Language:** TypeScript with strict compiler settings
- **Testing:** Jest
- **Linting:** ESLint with the recommended TypeScript rules

The application separates its responsibilities across modules:

- `src/main.ts` manages screen state and user interactions.
- `src/views.ts` renders the dashboard, form builder, respondent page, and results.
- `src/types.ts` defines the shared form and submission data types.
- `src/storage.ts` validates and saves forms in browser storage.
- `src/quiz-session.ts` collects answers recursively and calculates quiz scores.
- `src/utils.ts` provides shared helpers and plain-text response downloads.
- `src/style.css` styles the responsive interface.
- `tests/quiz-session.test.cjs` tests answer collection, scoring, and question limits.

### Run the application

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

### Test, lint, and build

```bash
npm test
npm run lint
npm run build
```

To serve the production build locally, run:

```bash
npm run preview
```

## Useful Websites

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vite.dev/guide/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [typescript-eslint Documentation](https://typescript-eslint.io/getting-started/)
- [MDN Web Docs: Web Storage API](https://developer.mozilla.org/docs/Web/API/Web_Storage_API)
- [MDN Web Docs: HTML Forms](https://developer.mozilla.org/docs/Learn_web_development/Extensions/Forms)

# AI Disclousure

I used AI tools as a learning and reference resource during this project. I used them mainly to brainstorm design ideas, clarify syntax questions, review logic, API data retrieiving and point me toward useful documentation when I got stuck.

When I received suggestions, I did not rely on them blindly. I reviewed the ideas carefully, rewrote code in my own style, adjusted variable and method names to match my project, and made sure the final solution fit naturally into my existing structure.

Using AI in this way helped me better understand programming concepts while still making sure I could explain the code, justify my design choices, and demonstrate my understanding during the video walkthrough.

## Future Work


- Add a backend so forms and submitted responses can be shared and managed across devices and users.
- Add a response-management page to review and export multiple submissions for each form.
- Add more question types, such as ratings, fill in the blank.

