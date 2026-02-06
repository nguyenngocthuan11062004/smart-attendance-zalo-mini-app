import * as admin from "firebase-admin";

admin.initializeApp();

export { startSession, endSession } from "./services/session.service";
export { scanTeacher, scanPeer, reviewAttendance } from "./services/attendance.service";
export { calculateTrustScores } from "./services/trust.service";
export { analyzeFraud } from "./services/fraud.service";
