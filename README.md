# Diem Danh Thong Minh - Smart Attendance System

He thong diem danh chong gian lan cho truong dai hoc Viet Nam, xay dung tren Zalo Mini App.

## Core Features

- **Peer Verification**: Sinh vien xac nhan cho nhau bang QR code (bidirectional)
- **Trust Score**: >=3 peers = Co mat, 1-2 = Can xem xet, 0 = Vang
- **Anti-fraud**: HMAC-SHA256 signed QR, auto-refresh, no self-scan, expiry check
- **Realtime Monitoring**: Giang vien theo doi diem danh realtime qua Firestore
- **AI Fraud Detection**: Phan tich mau gian lan bang Claude API (weekly scheduled)
- **Teacher Review**: Giang vien xem xet va quyet dinh cac truong hop borderline

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **UI Library**: ZMP-UI (Zalo Mini App UI)
- **State Management**: Jotai (atomic state)
- **Backend**: Firebase Firestore + Cloud Functions
- **QR Code**: qrcode + HMAC-SHA256 signing (crypto-js)
- **AI**: Claude API for fraud pattern analysis

## Project Structure

```
src/
├── types/          # TypeScript interfaces
├── config/         # Firebase config
├── services/       # Firestore CRUD, QR, auth
├── store/          # Jotai atoms (auth, classes, session, attendance, ui)
├── hooks/          # Custom hooks (useAuth, useSession, useQR*, useAttendance)
├── components/     # Reusable UI (guards, navigation, qr, attendance, class)
├── pages/          # Route pages (splash, login, home, student/*, teacher/*)
├── utils/          # Crypto, validation
└── css/            # Tailwind + custom SCSS

functions/          # Firebase Cloud Functions
├── src/services/   # session, attendance, trust, fraud (Claude AI)
└── src/middleware/  # auth (Zalo token), rate limiting
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Fill in `.env` with your Firebase project config:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### 4. Deploy Cloud Functions
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### 5. (Optional) Configure Claude API for fraud detection
```bash
firebase functions:config:set claude.api_key="YOUR_CLAUDE_API_KEY"
```

### 6. Start development
```bash
npm start  # or: zmp start
```

## User Flows

### Student Flow
1. Splash -> Auto-login via Zalo -> Select role (first time)
2. Join class by code
3. Scan teacher's QR to check in
4. Show personal QR for peers to scan
5. Scan 3+ peers' QR for verification
6. View attendance history

### Teacher Flow
1. Create class -> Share class code
2. Start attendance session -> QR auto-refreshes every 15s
3. Monitor realtime attendance
4. End session -> Review borderline cases (1-2 peers)
5. Approve/reject attendance manually

## Deployment
```bash
zmp login
zmp deploy
```
