import { Routes } from '@angular/router';

export const routes: Routes = [
  // Redirect mặc định về trang login
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then(
            (m) => m.Register,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./features/layout/main-layout/main-layout').then(
        (m) => m.MainLayout,
      ),
    // authGuard sẽ gắn vào đây sau khi có auth service
    // canActivate: [authGuard],
    children: [
      {
        path: 'story-board',
        loadComponent: () =>
          import(
            './features/story-board/story-board-page'
          ).then((m) => m.StoryBoardPage),
      },
      {
        path: 'comic-editor',
        loadComponent: () =>
          import(
            './features/comic-editor/comic-editor-page'
          ).then((m) => m.ComicEditorPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import(
            './features/information-page/information-page'
          ).then((m) => m.InformationPage),
      },
      {
        path: 'pricing-page',
        loadComponent: () =>
          import(
            './features/pricing-page/pricing-page'
          ).then((m) => m.PricingPage),
      },
      // Redirect /app → /app/comic-editor
      { path: '', redirectTo: 'comic-editor', pathMatch: 'full' },
    ],
  },

    // ── Wildcard ─────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
