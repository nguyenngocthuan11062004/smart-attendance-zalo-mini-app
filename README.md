<div align="center">

# inHUST Attendance

### Smart Attendance System on Zalo Mini App

A multi-factor anti-fraud attendance system for universities, featuring HMAC-rotating QR codes, client-side face recognition, peer-to-peer verification, and GPS geofencing.

Built as a Zalo Mini App — no separate installation required for 150M+ Zalo users in Vietnam.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Zalo](https://img.shields.io/badge/Zalo-Mini%20App-0068FF?logo=zalo&logoColor=white)](https://miniapp.zaloplatforms.com)
[![Tests](https://img.shields.io/badge/Tests-53%20passing-22c55e)](./vitest.config.ts)
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)

<img src="src/static/icon_inhust.png" alt="inHUST Logo" width="120" />

</div>

---

## Why inHUST?

Traditional attendance systems suffer from **proxy check-ins** (friends marking for absent students), **QR screenshot sharing**, and **lack of identity verification**. inHUST solves all three with a unique **4-step multi-factor verification** that no other system combines:

| Step | Method | What it prevents |
|------|--------|-----------------|
| 1. **QR Scan** | HMAC-SHA256 rotating QR (30s) | Screenshot sharing, replay attacks |
| 2. **Face Verify** | Client-side AI face recognition | Proxy attendance |
| 3. **Peer Exchange** | Bidirectional P2P QR verification | Remote check-ins |
| 4. **GPS Check** | Geofence validation | Off-campus attendance |

> **Peer-to-Peer QR Verification** is a novel concept not found in any existing commercial or research attendance system worldwide.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ZALO MINI APP (Frontend)                  │
│  React 18 + TypeScript + Tailwind CSS + ZMP SDK + Jotai     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ QR Scan  │  │  Face AI │  │ Peer P2P │  │ GPS Check│    │
│  │ HMAC-256 │  │face-api.js│ │ Exchange │  │ Geofence │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │ Firestore SDK
┌───────────────────────▼─────────────────────────────────────┐
│                    FIREBASE (Backend)                        │
│  Firestore (8 collections) + Hosting + Storage              │
│  users | classes | sessions | attendance | face_registrations│
│  verified_students | teacher_invites | fraud_reports         │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│               ADMIN DASHBOARD (Web App)                      │
│  React + Ant Design 5 + Recharts + xlsx                      │
│  User mgmt | Class mgmt | Invite codes | Reports | Analytics│
│  https://inhust-admin.web.app                                │
└─────────────────────────────────────────────────────────────┘
```

For a detailed architecture diagram, see [`docs/architecture-diagram.html`](docs/architecture-diagram.html).

---

## Features

### Student App (Zalo Mini App)

- **4-step attendance flow**: QR → Face → Peer → Done
- **Email OTP verification** with HUST email (@sis.hust.edu.vn)
- **Face registration** with 2 selfies (front + angle)
- **Client-side face recognition** — face-api.js, no server upload
- **Attendance history** with trust score breakdown
- **AI Chat assistant** (Groq API, Llama 3.3 70B)
- **Pull-to-refresh** on all list pages

### Teacher App (Zalo Mini App)

- **Session management** with duration selection (30/45/60/90/120 min)
- **HMAC-SHA256 rotating QR** code display (30s interval)
- **Realtime monitoring** with trust score + GPS distance
- **Trust score reasons** — detailed explanation for review/absent
- **Manual attendance** with reason tracking
- **Teacher override** — approve/reject borderline cases
- **Auto-end session** with trust score computation
- **Fraud analysis** — detect always_same_peers, rapid_verification, etc.
- **CSV export** with UTF-8 BOM

### Admin Dashboard (Web App)

- **Dashboard** — aggregate stats, charts (Recharts)
- **User management** — search, filter by role
- **Class management** — create classes, assign teachers
- **Student management** — autocomplete search, add to class, import Excel
- **Teacher invite codes** — 8-char codes with 7-day expiry
- **Attendance reports** — filter by date range and class
- **Absence requests** — approve/reject with notes
- **Fraud reports** — expandable pattern details

### Security

- **HMAC-SHA256 rotating QR** — like Google Authenticator TOTP, 30s rotation with random nonce
- **Client-side face recognition** — face descriptors (128-dim vectors) stored, not photos
- **Email OTP verification** — one-time link to HUST student ID
- **GPS geofencing** — block check-ins outside classroom radius
- **Teacher invite codes** — prevent unauthorized role escalation
- **Consent screen** — explicit agreement before biometric data collection

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript 5.9, Tailwind CSS 3.4, SCSS |
| **Mini App** | ZMP SDK, ZMP UI, ZMP CLI |
| **State** | Jotai (atomic state management) |
| **Face AI** | @vladmandic/face-api (TinyFaceDetector + FaceRecognition) |
| **QR** | qrcode + jsqr + HMAC-SHA256 (crypto-js) |
| **Backend** | Firebase Firestore, Hosting, Storage |
| **Admin** | React, Ant Design 5, Recharts, xlsx (SheetJS) |
| **Email** | EmailJS (OTP verification) |
| **AI Chat** | Groq API (Llama 3.3 70B) |
| **Build** | Vite 5 + zmp-vite-plugin |
| **Testing** | Vitest (53 tests) + Playwright MCP |

---

## Quick Start

### Prerequisites

- Node.js 18+
- [ZMP CLI](https://miniapp.zaloplatforms.com/documents/) (`npm install -g zmp-cli`)
- Firebase project (Spark plan works for development)

### 1. Clone & Install

```bash
git clone https://github.com/nguyenngocthuan11062004/smart-attendance-zalo-mini-app.git
cd smart-attendance-zalo-mini-app
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_EMAILJS_SERVICE_ID=service_xxx
VITE_EMAILJS_TEMPLATE_ID=template_xxx
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

### 3. Run Development Server

```bash
zmp start
```

> **Important**: Use `zmp start`, NOT `npm start` or `vite dev`.

### 4. Deploy

```bash
zmp deploy              # Deploy to Zalo platform
firebase deploy --only firestore:rules  # Deploy Firestore rules
```

### 5. Admin Dashboard

```bash
cd admin
npm install
npm run dev             # Development
npx vite build && cd .. && firebase deploy --only hosting:admin  # Production
```

---

## Project Structure

```
src/
├── app.ts                          # Entry point
├── components/
│   ├── attendance/                 # TrustBadge, StepIndicator, PeerCounter
│   ├── face/                       # CameraCapture, FaceVerification
│   ├── guards/                     # AuthGuard, RoleGuard
│   ├── navigation/                 # AppBottomNav
│   ├── qr/                         # QRDisplay, QRScanner, InlineQRScanner
│   └── ui/                         # DarkModal, ScoreRing, ErrorBoundary
├── hooks/
│   ├── useAttendance.ts            # Attendance state + actions
│   ├── useAuth.ts                  # Auth actions (selectRole, logout)
│   ├── useGeolocation.ts           # GPS location
│   ├── useQRGenerator.ts           # HMAC rotating QR generation
│   └── useQRScanner.ts             # Camera QR scanning
├── pages/
│   ├── student/                    # StudentAttendance, StudentHistory, FaceRegister
│   └── teacher/                    # TeacherSession, TeacherMonitor, TeacherReview
├── services/
│   ├── attendance.service.ts       # Attendance CRUD (Firestore direct)
│   ├── auth.service.ts             # Zalo auth + Firestore user docs
│   ├── face.service.ts             # Face registration + verification (face-api.js)
│   ├── face-ai.service.ts          # face-api.js wrapper (lazy loaded)
│   ├── email-verify.service.ts     # Email OTP verification
│   ├── invite.service.ts           # Teacher invite codes
│   └── session.service.ts          # Session management
├── store/                          # Jotai atoms (auth, session, attendance, ui)
├── types/index.ts                  # TypeScript interfaces + computeTrustScore
├── utils/
│   ├── crypto.ts                   # HMAC-SHA256, nonce generation
│   ├── validation.ts               # QR payload validation
│   ├── sanitize.ts                 # Input validation (MSSV, phone, email)
│   ├── geo.ts                      # Haversine distance + geofence check
│   └── storage.ts                  # Zalo Storage wrapper + localStorage fallback
├── admin/                          # Admin Dashboard (React + Ant Design)
├── functions/                      # Cloud Functions (prepared, needs Blaze plan)
├── legal/                          # Terms of service + webhook (Firebase Hosting)
└── docs/                           # Architecture diagram, test scenarios, reports
```

---

## Testing

```bash
# Unit tests (Vitest)
npx vitest run src/utils        # 53 tests — crypto, validation, sanitize

# Type check
npx tsc --noEmit

# Manual test scenarios
# See docs/test-scenarios.md — 72 test cases across 19 categories
```

---

## Comparison with Existing Systems

| Feature | inHUST | SEAtS ONE | Top Hat | Moodle | Minop Cloud |
|---------|--------|-----------|---------|--------|-------------|
| HMAC Rotating QR | **30s + nonce** | Basic | No | No | No |
| Face Recognition | **Client-side AI** | No | No | No | Tablet (shared) |
| Peer P2P Verify | **Novel concept** | No | No | No | No |
| GPS Geofence | **Yes** | Yes | Yes | No | Location-aware |
| Hardware Required | **None** | Beacon ($) | No | No | Tablet ($) |
| Platform | **Zalo (150M users)** | Standalone | Standalone | LMS Plugin | Standalone |
| Cost (30K students) | **$10-15/mo** | $10K-50K/yr | $5K-20K/yr | Free (limited) | $3K-10K |

---

## Cost Estimation

| Scale | Monthly Cost | Notes |
|-------|-------------|-------|
| Demo (50 students) | **$0** | Firebase Spark (free) |
| 1 department (500) | **$2-3** | Firebase Blaze (pay-as-you-go) |
| Full university (30K) | **$10-15** | 50-100x cheaper than commercial solutions |

---

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Student/teacher profiles, role, MSSV |
| `classes` | Class info, teacher assignment, student list |
| `sessions` | Attendance sessions with HMAC secret, GPS, duration |
| `attendance` | Check-in records, peer verifications, face results, GPS |
| `face_registrations` | 128-dim face descriptors (not photos) |
| `verified_students` | Email OTP verification status |
| `teacher_invites` | Invite codes for teacher registration |
| `fraud_reports` | Auto-detected fraud patterns |

---

## Roadmap

- [x] 4-step attendance flow (QR → Face → Peer → Done)
- [x] HMAC-SHA256 rotating QR codes
- [x] Client-side face recognition (face-api.js)
- [x] GPS geofencing
- [x] Email OTP student verification
- [x] Teacher invite codes
- [x] Auto-end session with timer
- [x] Admin dashboard with class/user management
- [x] Trust score with detailed reasons
- [x] Fraud detection patterns
- [ ] Late threshold (mark "late" after X minutes)
- [ ] Absence request (student side)
- [ ] Firebase Auth (Custom Token from Zalo)
- [ ] Push notifications before class
- [ ] Timetable integration

---

## Author

**Nguyen Ngoc Thuan** — MSSV: 20225413

Bachelor's Thesis — Hanoi University of Science and Technology (HUST)

Advisor: Le Ba Vui

School of Information and Communication Technology, K67

---

## License

This project is developed for academic purposes (Bachelor's Thesis at HUST). Personal use is free.
