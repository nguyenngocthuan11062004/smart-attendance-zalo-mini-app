# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview

**inHUST Attendance** is a Zalo Mini App for smart attendance tracking at HUST (Hanoi University of Science and Technology). Students check in via a 4-step flow: QR scan -> face verification -> peer QR exchange -> done. Uses HMAC-rotating QR codes and face recognition to prevent fraud.

## Tech Stack

- **Framework**: Zalo Mini App (ZMP SDK + ZMP UI)
- **UI**: React 18 + TypeScript 5.9 + Tailwind CSS 3.4 + SCSS
- **State**: Jotai (atomic state management)
- **Backend**: Firebase (Firestore, Cloud Functions, Storage)
- **Build**: Vite 5 + zmp-vite-plugin
- **QR**: `qrcode` + `jsqr` libraries + HMAC-SHA256 (crypto-js) for rotating QR codes (30s interval)
- **Routing**: `react-router-dom` via ZMP's `ZMPRouter` + `AnimationRoutes`
- **Face**: Camera capture with oval clip, auto-scan face verification

## Commands

```bash
zmp start          # Dev server (NOT `vite dev` or `npm start`)
zmp deploy         # Deploy to Zalo platform
npx tsc --noEmit   # Type check (no build output)
```

**Important**: Do NOT use `npx vite build` -- ZMP uses its own entry resolution via `zmp-vite-plugin`. Use `zmp start` for dev and `zmp deploy` for production.

## Project Structure

```
src/
├── app.ts                     # Entry point (imports CSS, mounts Layout)
├── css/
│   ├── app.scss               # Light theme styles, CSS variables, animations
│   └── tailwind.scss          # Tailwind directives
├── components/
│   ├── layout.tsx             # Root layout (JotaiProvider, App, Router, Routes)
│   ├── navigation/AppBottomNav.tsx  # Bottom nav (home, search, profile)
│   ├── guards/AuthGuard.tsx, RoleGuard.tsx
│   ├── ui/                    # Shared UI components
│   │   ├── ScoreRing.tsx      # SVG donut chart
│   │   ├── DarkStatCard.tsx   # Stat card with glow
│   │   ├── DarkProgressBar.tsx
│   │   ├── DarkModal.tsx      # Bottom-sheet glassmorphism modal
│   │   ├── ErrorBoundary.tsx
│   │   ├── ErrorToast.tsx
│   │   ├── GlobalLoading.tsx
│   │   ├── OfflineBanner.tsx
│   │   └── PullToRefresh.tsx
│   ├── attendance/            # TrustBadge, AttendanceCard, StepIndicator, PeerCounter
│   ├── class/ClassCard.tsx
│   ├── face/                  # FaceRegistration, FaceVerification, CameraCapture, FaceStatusBadge, LivenessChallenge
│   ├── qr/                    # QRDisplay, QRScanner, QRCountdown, InlineQRScanner
│   └── profile/MicrosoftLinkCard.tsx
├── pages/
│   ├── splash.tsx             # Animated splash screen
│   ├── welcome.tsx            # Onboarding carousel
│   ├── login.tsx              # Role selection (student/teacher)
│   ├── home.tsx               # Dashboard with calendar, stats, menu grid
│   ├── profile.tsx            # User profile with edit modal
│   ├── search.tsx             # Search page
│   ├── dev.tsx                # Dev navigation (all screens + mock mode)
│   ├── student/
│   │   ├── StudentClasses.tsx     # Student class list
│   │   ├── StudentAttendance.tsx  # 4-step attendance flow (QR -> Face -> Peer -> Done)
│   │   ├── StudentHistory.tsx     # Attendance history
│   │   └── FaceRegister.tsx       # CCCD/face registration
│   └── teacher/
│       ├── TeacherClasses.tsx     # Teacher class list
│       ├── TeacherClassDetail.tsx # Class detail with student list
│       ├── TeacherSession.tsx     # Start/manage attendance session
│       ├── TeacherMonitor.tsx     # Live session monitoring
│       ├── TeacherReview.tsx      # Review attendance records
│       ├── TeacherFraudReport.tsx # Fraud detection report
│       └── TeacherAnalytics.tsx   # Class analytics/statistics
├── hooks/
│   ├── useAuth.ts             # Auth actions (selectRole, logout)
│   ├── useAuthInit.ts         # Auto sign-in at app root
│   ├── useAttendance.ts       # Attendance state subscription
│   ├── useSession.ts          # Session management
│   ├── useQRGenerator.ts      # HMAC-rotating QR code generation (30s default)
│   ├── useQRScanner.ts        # QR scanning with camera
│   ├── useCountdown.ts        # Countdown timer
│   ├── useGeolocation.ts      # GPS location
│   ├── useNetworkStatus.ts    # Online/offline detection
│   └── usePullToRefresh.ts    # Pull-to-refresh gesture
├── services/
│   ├── auth.service.ts        # Zalo sign-in, user CRUD, phone number
│   ├── class.service.ts       # Class CRUD
│   ├── session.service.ts     # Session management
│   ├── attendance.service.ts  # Attendance records
│   ├── face.service.ts        # Face registration/verification
│   ├── fraud.service.ts       # Fraud detection
│   ├── qr.service.ts          # QR code utilities
│   ├── microsoft.service.ts   # Microsoft OAuth
│   ├── report.service.ts      # Reports
│   └── api.ts                 # API helpers
├── store/                     # Jotai atoms
│   ├── auth.ts                # currentUserAtom, userRoleAtom, authInitializedAtom
│   ├── session.ts             # activeSessionAtom
│   ├── attendance.ts          # myAttendanceAtom, attendanceStepAtom
│   ├── classes.ts             # Class-related atoms
│   └── ui.ts                  # globalLoadingAtom, globalErrorAtom
├── config/firebase.ts         # Firebase config
├── types/index.ts             # TypeScript interfaces (UserDoc, ClassDoc, SessionDoc, AttendanceDoc, etc.)
├── utils/
│   ├── validation.ts          # QR validation, QR_EXPIRY_MS (90s)
│   ├── sanitize.ts            # Input sanitization (isValidPhone, isValidEmail)
│   ├── crypto.ts              # HMAC-SHA256 utilities
│   ├── mock-data.ts           # Mock data for dev mode
│   ├── mock-db.ts             # In-memory mock database
│   ├── seed-data.ts           # Seed data for testing
│   ├── cache.ts               # Caching utilities
│   ├── retry.ts               # Retry logic
│   ├── offlineQueue.ts        # Offline action queue
│   └── cloudFallback.ts       # Cloud function fallbacks
└── static/                    # Images
    ├── splash_inhust.png
    ├── icon_inhust.png
    ├── bk_logo.png
    ├── bgprofile.jpg
    └── bg.svg
```

## Design System (Light Theme)

The app uses a **light theme** with HUST red accent:

### Colors
- **Backgrounds**: `#f2f2f7` (primary), `#ffffff` (cards), `#f0f0f5` (elevated), `#e5e7eb` (tracks)
- **Text**: `#1a1a1a` (primary), `#6b7280` (secondary), `#9ca3af` (muted)
- **Accent**: `#be1d2c` (HUST red), `#a78bfa` (purple for score rings)
- **Status**: `#22c55e` (green/present), `#f59e0b` (amber/review), `#ef4444` (red/absent)
- **Borders**: `rgba(0,0,0,0.06)` subtle
- **Card shadow**: `boxShadow: "0 1px 4px rgba(0,0,0,0.06)"`

### Header Pattern (HUST Red, Rounded)
All screens use this header style:
```tsx
<div style={{
  background: "#be1d2c", borderRadius: "0 0 24px 24px",
  padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
  display: "flex", alignItems: "center", justifyContent: "space-between",
}}>
  <button style={{
    width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  </button>
  <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>TITLE</span>
  <div style={{ width: 36 }} /> {/* or bell icon button */}
</div>
```

### CSS Classes (defined in app.scss)
- `.page` -- Base page with light bg + safe area padding
- `.card`, `.card-flat`, `.card-glass` -- Card variants
- `.btn-primary-dark`, `.btn-secondary-dark` -- Button styles
- `.filter-chip` -- Filter chip with `.active` state
- `.skeleton` -- Shimmer loading placeholder
- `.section-label` -- Uppercase gray section title
- `.empty-state` -- Centered empty state
- `.input-dark` -- Input field with focus glow
- `.modal-overlay-dark`, `.modal-content-dark` -- Bottom-sheet modal
- `.animate-stagger-1` through `.animate-stagger-10` -- Stagger slide-up animations
- `@keyframes scanLine` -- QR scan line animation

### Shared Components
- `ScoreRing` -- SVG donut chart (percentage, size, color, children)
- `DarkStatCard` -- Stat card (value, label, color, glow)
- `DarkProgressBar` -- Progress bar (percentage, color, height)
- `DarkModal` -- Bottom-sheet modal (visible, onClose, title, children)
- `InlineQRScanner` -- Camera-based QR scanner with auto-detect (onDetect, active, height, aspectRatio)

## Coding Conventions

### React Hooks
- **CRITICAL**: All hooks (useState, useEffect, useCallback, useAtomValue, etc.) MUST be called before any conditional early returns. React rules of hooks must be respected.
- Use Jotai atoms for global state, local useState for component state.

### Routing
- `useNavigate` MUST be imported from `"react-router-dom"`, NOT from `"zmp-ui"`.
- Route definitions are in `src/components/layout.tsx`.

### Styling
- Prefer inline `style={{}}` for theme colors (most components use this pattern).
- Use CSS classes from `app.scss` for reusable patterns.
- Use Tailwind utilities for layout (`flex`, `grid`, `space-y-*`, etc.).
- Cards: white bg, `borderRadius: 16-20`, `border: "1px solid rgba(0,0,0,0.06)"`, `boxShadow: "0 1px 4px rgba(0,0,0,0.06)"`.

### ZMP UI Components
- Use `Page`, `Avatar`, `Input`, `Spinner`, `Icon` from `"zmp-ui"` where appropriate.
- Do NOT use `<Header>` from zmp-ui -- use the custom HUST red header pattern above.
- Use `useSnackbar()` for toast messages (must be inside `SnackbarProvider`).
- Prefer native `<button>` with custom styles over `<Button>` from zmp-ui.
- Use `DarkModal` instead of `Modal` from zmp-ui for all modals.

### Firebase
- Config in `src/config/firebase.ts`
- Services in `src/services/` handle all Firestore/Functions calls
- Cloud Functions called via `httpsCallable(functions, "functionName")`

### Auth Flow
- `signIn()` in auth.service.ts: authorize both scopes (userInfo + phone) in single popup, then getUserInfo + getPhoneNumber
- `initAuthState()`: restore from localStorage first (instant), background refresh from Zalo SDK
- Phone number: `getPhoneNumber()` returns `{ number }` directly or `{ token }` needing server-side decode

### QR Timing
- QR refresh interval: **30 seconds** (qrRefreshInterval in session docs)
- QR expiry tolerance: **90 seconds** (QR_EXPIRY_MS in validation.ts)

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
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* HUST red header */}
      {/* content with padding */}
    </Page>
  );
}
```

### Card pattern
```tsx
<div style={{
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
}}>
  {/* content */}
</div>
```

### Attendance 4-Step Flow (StudentAttendance.tsx)
1. **Step 1 (QR)**: Scan teacher's rotating QR code via InlineQRScanner
2. **Step 2 (Face)**: Auto-scan face verification with oval clip (no button press)
3. **Step 3 (Peer)**: Side-by-side layout -- own QR code (left) + camera auto-scanning peers (right)
4. **Step 4 (Done)**: Completion screen with trust score

### Dev Page (/dev)
- Mock mode toggle for offline testing
- Quick navigation buttons for all screens including attendance steps 1-4
- Uses mock sessions (session_step1-4) with matching attendance records
