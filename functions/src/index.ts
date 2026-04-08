import * as admin from "firebase-admin";

admin.initializeApp();

export { startSession, endSession } from "./services/session.service";
export { scanTeacher, scanPeer, reviewAttendance, submitFaceResult, manualAttendance } from "./services/attendance.service";
export { calculateTrustScores } from "./services/trust.service";
export { analyzeFraud, weeklyFraudAnalysis } from "./services/fraud.service";
export { registerFace, verifyFace } from "./services/face.service";
export { initMicrosoftOAuth, microsoftOAuthCallback } from "./services/microsoft-oauth.service";
export { resolveZaloPhoneToken } from "./services/zalo-phone.service";
export { aiChat } from "./services/ai.service";
export { assignTeacherRole } from "./services/role.service";
export { adminDashboardStats, adminBulkAssignStudents, adminReviewAbsenceRequest, adminCreateAccount } from "./services/admin.service";
export { createFirebaseToken } from "./services/auth-token.service";
