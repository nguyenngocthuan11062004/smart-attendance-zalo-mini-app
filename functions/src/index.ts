import * as admin from "firebase-admin";

admin.initializeApp();

export { startSession, endSession } from "./services/session.service";
export { scanTeacher, scanPeer, reviewAttendance } from "./services/attendance.service";
export { calculateTrustScores } from "./services/trust.service";
export { analyzeFraud, weeklyFraudAnalysis } from "./services/fraud.service";
export { registerFace, verifyFace } from "./services/face.service";
