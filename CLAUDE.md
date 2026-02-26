# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview

**inHUST Attendance** is a Zalo Mini App for smart attendance tracking at HUST (Hanoi University of Science and Technology). Students check in via QR codes with peer-to-peer verification and face recognition to prevent fraud.

## Tech Stack

- **Framework**: Zalo Mini App (ZMP SDK + ZMP UI)
- **UI**: React 18 + TypeScript 5.9 + Tailwind CSS 3.4 + SCSS
- **State**: Jotai (atomic state management)
- **Backend**: Firebase (Firestore, Cloud Functions, Storage)
- **Build**: Vite 5 + zmp-vite-plugin
- **QR**: `qrcode` library + HMAC-SHA256 (crypto-js) for rotating QR codes
- **Routing**: `react-router-dom` via ZMP's `ZMPRouter` + `AnimationRoutes`

## Commands

```bash
zmp start          # Dev server (NOT `vite dev` or `npm start`)
zmp deploy         # Deploy to Zalo platform
npx tsc --noEmit   # Type check (no build output)
```

**Important**: Do NOT use `npx vite build` — ZMP uses its own entry resolution via `zmp-vite-plugin`. Use `zmp start` for dev and `zmp deploy` for production.

## Project Structure

```
src/
├── app.ts                     # Entry point (imports CSS, mounts Layout)
├── css/
│   ├── app.scss               # Dark theme styles, CSS variables, components
│   └── tailwind.scss          # Tailwind directives
├── components/
│   ├── layout.tsx             # Root layout (JotaiProvider, App, Router, Routes)
│   ├── navigation/AppBottomNav.tsx
│   ├── guards/AuthGuard.tsx, RoleGuard.tsx
│   ├── ui/                    # Shared UI components
│   │   ├── ScoreRing.tsx      # SVG donut chart
│   │   ├── DarkStatCard.tsx   # Dark stat card with glow
│   │   ├── DarkProgressBar.tsx
│   │   ├── DarkModal.tsx      # Bottom-sheet glassmorphism modal
│   │   ├── ErrorBoundary.tsx
│   │   ├── GlobalLoading.tsx
│   │   ├── OfflineBanner.tsx
│   │   └── PullToRefresh.tsx
│   ├── attendance/            # TrustBadge, AttendanceCard, StepIndicator, PeerCounter
│   ├── class/ClassCard.tsx
│   ├── face/                  # FaceRegistration, FaceVerification, CameraCapture, LivenessChallenge
│   ├── qr/                    # QRDisplay, QRScanner, QRCountdown
│   └── profile/MicrosoftLinkCard.tsx
├── pages/
│   ├── splash.tsx, welcome.tsx, login.tsx, home.tsx, profile.tsx, search.tsx, dev.tsx
│   ├── student/               # StudentClasses, StudentAttendance, StudentHistory, FaceRegister
│   └── teacher/               # TeacherClasses, TeacherSession, TeacherMonitor, TeacherReview,
│                              # TeacherClassDetail, TeacherFraudReport, TeacherAnalytics
├── hooks/                     # useAuth, useAuthInit, useAttendance, useQRGenerator, useQRScanner, useGeolocation
├── services/                  # auth.service, class.service, session.service, attendance.service, face.service, fraud.service
├── store/                     # Jotai atoms (auth.ts, session.ts, ui.ts)
├── config/firebase.ts         # Firebase config
├── types/index.ts             # TypeScript interfaces
├── utils/                     # validation.ts, sanitize.ts
└── static/                    # Images (splash_inhust.png, icon_inhust.png, bk_logo.png, bgprofile.jpg)
```

## Design System (Dark Theme)

The app uses a **dark theme** inspired by SDK Sleep (smartwatch style):

### Colors
- **Backgrounds**: `#0a0a0f` (primary), `#16161e` (cards), `#1e1e2a` (elevated), `#27273a` (tracks)
- **Text**: `#ffffff` (primary), `#9ca3af` (secondary), `#6b7280` (muted)
- **Accent**: `#dc2626` (HUST red), `#a78bfa` (purple for score rings)
- **Status**: `#22c55e` (green/present), `#f59e0b` (amber/review), `#ef4444` (red/absent)
- **Borders**: `rgba(255,255,255,0.06)` subtle, `rgba(255,255,255,0.1)` medium

### CSS Classes (defined in app.scss)
- `.page` — Base page with dark bg + safe area padding
- `.card`, `.card-flat`, `.card-glass` — Card variants (glass = backdrop-filter blur)
- `.btn-primary-dark`, `.btn-secondary-dark` — Button styles
- `.filter-chip` — Filter chip with `.active` state
- `.skeleton` — Shimmer loading placeholder
- `.section-label` — Uppercase gray section title
- `.empty-state`, `.empty-state-dark` — Centered empty state
- `.input-dark` — Dark input field with focus glow
- `.modal-overlay-dark`, `.modal-content-dark` — Bottom-sheet modal
- `.animate-stagger-1` through `.animate-stagger-10` — Stagger slide-up animations

### Shared Components
- `ScoreRing` — SVG donut chart (percentage, size, color, children)
- `DarkStatCard` — Stat card (value, label, color, glow)
- `DarkProgressBar` — Progress bar (percentage, color, height)
- `DarkModal` — Bottom-sheet modal (visible, onClose, title, children)

## Coding Conventions

### React Hooks
- **CRITICAL**: All hooks (useState, useEffect, useCallback, useAtomValue, etc.) MUST be called before any conditional early returns. React rules of hooks must be respected.
- Use Jotai atoms for global state, local useState for component state.

### Routing
- `useNavigate` MUST be imported from `"react-router-dom"`, NOT from `"zmp-ui"`.
- Route definitions are in `src/components/layout.tsx`.

### Styling
- Prefer inline `style={{}}` for dark theme colors (most components use this pattern).
- Use CSS classes from `app.scss` for reusable patterns (`.card`, `.btn-primary-dark`, etc.).
- Use Tailwind utilities for layout (`flex`, `grid`, `space-y-*`, etc.).
- Cards: `borderRadius: 16-20`, `border: "1px solid rgba(255,255,255,0.06)"`.

### ZMP UI Components
- Use `Page`, `Header`, `Avatar`, `Input`, `Spinner`, `Icon` from `"zmp-ui"` where appropriate.
- Use `useSnackbar()` for toast messages (must be inside `SnackbarProvider`).
- Prefer native `<button>` with custom dark classes over `<Button>` from zmp-ui.
- Use `DarkModal` instead of `Modal` from zmp-ui for all modals.

### Firebase
- Config in `src/config/firebase.ts`
- Services in `src/services/` handle all Firestore/Functions calls
- Cloud Functions called via `httpsCallable(functions, "functionName")`

## Common Patterns

### Page template
```tsx
export default function SomePage() {
  // ALL hooks first
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const [data, setData] = useState([]);

  useEffect(() => { /* load data */ }, []);

  // Early returns AFTER all hooks
  if (!user) return null;

  return (
    <Page className="page" style={{ background: "#0a0a0f" }}>
      <Header title="Title" />
      {/* content */}
    </Page>
  );
}
```

### Dark card pattern
```tsx
<div style={{
  background: "#16161e",
  borderRadius: 16,
  padding: 16,
  border: "1px solid rgba(255,255,255,0.06)",
}}>
  {/* content */}
</div>
```
