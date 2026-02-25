# Frontend Architecture — Quick Reference for AI Assistants

## Tech Stack
- **Vite 7** + **React 19** + **TypeScript 5.9**
- **Tailwind CSS 4** (via `@tailwindcss/vite` plugin, NO `tailwind.config.ts` — config in `globals.css`)
- **Shadcn/ui** components (Radix primitives + CVA + tailwind-merge) in `src/components/ui/`
- **Redux Toolkit 2** + **RTK Query** for state & API calls
- **React Router DOM 7** (BrowserRouter, lazy routes)
- **Axios** for custom API calls (interceptors with JWT)
- **Sonner** for toast notifications
- **Lucide React** for icons
- **PWA** via `vite-plugin-pwa`

## File Structure
```
src/
├── main.tsx                  # Entry point — renders Providers + AppRouter
├── app/
│   ├── Providers.tsx         # Redux Provider + BrowserRouter + Toaster + ErrorBoundary
│   ├── ThemeInitializer.tsx  # Syncs Redux theme → data-theme attribute on <html>
│   ├── Layout.tsx            # Sidebar + Header + <Outlet/> (for protected pages)
│   ├── ProtectedRoute.tsx    # Redirects to /login if !isAuthenticated
│   └── AppRouter.tsx         # All routes defined here (lazy loaded)
├── components/
│   ├── ui/                   # Shadcn/ui primitives: Button, Card, Dialog, Input, etc.
│   ├── Header.tsx            # Top bar: hamburger menu, theme toggle, user dropdown
│   ├── Sidebar.tsx           # Left nav: collapsible on mobile, NavLink items
│   ├── ThemeToggle.tsx       # Sun/Moon icon button
│   └── ErrorBoundary.tsx     # Catches React errors
├── features/
│   ├── auth/authSlice.ts     # Redux: user, token, isAuthenticated + localStorage persist
│   └── ui/uiSlice.ts         # Redux: theme (light/dark), sidebarOpen
├── pages/
│   ├── Dashboard.tsx         # Stats cards + activity feed (uses RTK Query)
│   ├── Settings.tsx          # Theme switch, notification toggles, toast demo
│   ├── Profile.tsx           # User form
│   ├── Login.tsx             # Demo login (pre-filled, stores JWT in Redux)
│   └── NotFound.tsx          # 404 page
├── hooks/
│   ├── useTheme.ts           # { theme, isDark, toggleTheme, setTheme }
│   └── useAuth.ts            # { user, isAuthenticated, login(), logout() }
├── store/
│   ├── index.ts              # configureStore + typed hooks (useAppDispatch, useAppSelector)
│   └── apiSlice.ts           # RTK Query: baseQuery with JWT, demo endpoints
├── lib/
│   ├── utils.ts              # cn() helper (clsx + twMerge)
│   └── api.ts                # Axios instance with interceptors
├── types/
│   └── index.ts              # User, AuthState, UiState, Theme
└── styles/
    └── globals.css           # Tailwind 4 import + CSS custom properties for light/dark theme
```

## Key Patterns

### Adding a new page
1. Create `src/pages/MyPage.tsx` (default export)
2. Add lazy import + `<Route>` in `src/app/AppRouter.tsx`

### Adding a new Redux slice
1. Create `src/features/myFeature/mySlice.ts`
2. Add reducer to `src/store/index.ts`

### Adding a new API endpoint (RTK Query)
1. Add endpoint in `src/store/apiSlice.ts` → `endpoints: (builder) => ({ ... })`
2. Export generated hook: `export const { useMyQuery } = apiSlice`

### Adding a new Shadcn/ui component
1. Create `src/components/ui/component-name.tsx`
2. Use Radix primitives + CVA + `cn()` utility (follow existing patterns)

### Theme system
- CSS variables in `src/styles/globals.css` (`:root` = light, `[data-theme="dark"]` = dark)
- Toggle via `useTheme()` hook or Redux `toggleTheme` action
- Tailwind 4 dark variant: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`

### API proxy
- Dev: Vite proxy `/api` → `http://localhost:8000` (configured in `vite.config.ts`)
- Prod: Configure reverse proxy or set `VITE_API_URL`

### Environment variables
- `VITE_API_URL` — backend API base URL
- `VITE_APP_NAME` — app display name
- Copy `.env.example` → `.env` to configure

## Commands
```bash
npm run dev       # Start dev server (port 5173)
npm run build     # Type-check + production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run format    # Prettier
```
