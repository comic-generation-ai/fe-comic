import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
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
    canActivate: [authGuard],
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
      { path: '', redirectTo: 'comic-editor', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
