# 🎨 ComicAI - Frontend Studio Console

Welcome to the **ComicAI Frontend Studio Console**, an interactive interface to manage and create comics using advanced AI models. This project is built on the modern Angular platform and optimized for a premium creator experience.

---

## 🚀 Technology Stack

This project leverages the following core technologies:

*   **Core Framework**: [Angular](https://angular.dev/) (v21.2.0) - Leveraging **Standalone Components** for clean, modular, and optimized code.
*   **Languages**: [TypeScript](https://www.typescriptlang.org/) & [HTML5 Semantic Markup](https://developer.mozilla.org/en-US/docs/Glossary/Semantics#html_semantics).
*   **Styling & UI**:
    *   **SCSS (Sass)** for advanced styling capabilities and layout organization.
    *   **Vanilla CSS Variables** to implement a dynamic Design System (supporting Dark/Light themes).
*   **Internationalization (i18n)**: Native multilingual support (English & Vietnamese) with real-time translation pipelines.
*   **Docker & Docker Compose**: For robust containerization and instant environment synchronization.
*   **Web Server (Production)**: [Nginx](https://nginx.org/) serving optimized static builds.
*   **Testing**: [Vitest](https://vitest.dev/) for fast and reliable unit testing.

---

## 🐳 Running the Project with Docker

Docker is pre-configured with a Development target featuring **Hot-Reload** and a Production target served by Nginx.

### 1. Run in Development Mode
In this mode, code on your local host synchronizes directly with the container. Saving any source file will trigger a hot reload inside the browser.

**Command:**
```bash
# Start container and trigger the build
docker compose up --build
```
*   **Access URL:** [http://localhost:4200](http://localhost:4200)
*   **Under the Hood:** Uses the `development` target in the `Dockerfile`, mounts the source folder via `volumes`, and enables filesystem polling for instant updates.

---

### 2. Build and Run in Production Mode (Multi-stage Build)
This configuration compiles the Angular code with optimizations and hosts it on Nginx.

**Commands:**
```bash
# 1. Build the production Docker image
docker build --target production -t fe-comic-prod .

# 2. Run the production container on port 80 (or any preferred port)
docker run -d -p 80:80 --name comic-frontend-prod fe-comic-prod
```
*   **Access URL:** [http://localhost](http://localhost)

---

### 3. Run Locally (Without Docker)
Requires Node.js v22 installed on your machine.

```bash
# Install dependencies
npm install

# Start development server
npm start
```

---

## 🛠️ Project Development Guidelines

To maintain code quality and fast load times, all developers must strictly adhere to the following rules:

### 1. Styling & Aesthetic Standards
*   **Premium Design**: Always use the predefined CSS variables from the design system (avoid hardcoding static color values or basic colors).
*   **Dark Mode & Responsiveness**: Every new layout must fully support Dark Mode and be responsive across mobile, tablet, and desktop screens.
*   **No Ad-hoc CSS**: Use utility classes or localized SCSS modules. Do not write inline styles (`style="..."`).
*   **Component CSS Budgets**: Budget configurations in `angular.json` limit component styles to a maximum of **30kB** (Error) and **20kB** (Warning). Keep CSS files modular, clean, and concise.

### 2. Localization (i18n) Rules
*   Do **NOT** write hardcoded user-facing strings in HTML templates.
*   Always use the `translate` pipe in HTML:
    ```html
    <h3>{{ 'PROFILE.SECURITY' | translate }}</h3>
    ```
*   Ensure that all translation keys are updated in both language packs:
    *   🇺🇸 [src/assets/i18n/en.json](file:///u:/comic-generation-ai/fe-comic/src/assets/i18n/en.json)
    *   🇻🇳 [src/assets/i18n/vi.json](file:///u:/comic-generation-ai/fe-comic/src/assets/i18n/vi.json)

### 3. Component Architecture
*   Prioritize creating **Standalone Components** to leverage code-splitting and lazy-loading.
*   All modals and dialogs must share a consistent look and feel (including standard backdrop blur and scale-in animations).
*   Maintain clean separation of concerns by keeping business logic distinct from template rendering.
