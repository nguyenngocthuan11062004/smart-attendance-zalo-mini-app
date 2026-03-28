import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { requireAdmin } from "../middleware/adminAuth";

const db = admin.firestore();

// ── Dashboard Stats ─────────────────────────────────────────────────────
export const adminDashboardStats = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAdmin(async () => {
      const [usersSnap, classesSnap, sessionsSnap, pendingSnap] = await Promise.all([
        db.collection("users").count().get(),
        db.collection("classes").count().get(),
        db.collection("sessions").where("status", "==", "active").count().get(),
        db.collection("absence_requests").where("status", "==", "pending").count().get(),
      ]);

      const [studentsSnap, teachersSnap] = await Promise.all([
        db.collection("users").where("role", "==", "student").count().get(),
        db.collection("users").where("role", "==", "teacher").count().get(),
      ]);

      return {
        totalUsers: usersSnap.data().count,
        totalStudents: studentsSnap.data().count,
        totalTeachers: teachersSnap.data().count,
        totalClasses: classesSnap.data().count,
        todayActiveSessions: sessionsSnap.data().count,
        pendingAbsenceRequests: pendingSnap.data().count,
      };
    })
  );

// ── Bulk Assign Students to Class ───────────────────────────────────────
export const adminBulkAssignStudents = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAdmin(async (data) => {
      const { classId, students } = data;

      if (!classId || !Array.isArray(students) || students.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "classId và students bắt buộc");
      }

      const classRef = db.collection("classes").doc(classId);
      const classSnap = await classRef.get();

      if (!classSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Lớp không tồn tại");
      }

      const batch = db.batch();
      const addedIds: string[] = [];
      const errors: string[] = [];

      for (const student of students) {
        const { mssv, name, email, department } = student;

        if (!mssv || !name) {
          errors.push(`Thiếu MSSV/tên: ${JSON.stringify(student)}`);
          continue;
        }

        // Check if user exists by mssv
        const existingSnap = await db
          .collection("users")
          .where("mssv", "==", mssv)
          .limit(1)
          .get();

        let userId: string;

        if (!existingSnap.empty) {
          userId = existingSnap.docs[0].id;
        } else {
          // Create new user with mssv as ID
          userId = mssv;
          batch.set(db.collection("users").doc(userId), {
            name,
            avatar: "",
            role: "student",
            mssv,
            email: email || "",
            department: department || "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        addedIds.push(userId);
      }

      if (addedIds.length > 0) {
        batch.update(classRef, {
          studentIds: admin.firestore.FieldValue.arrayUnion(...addedIds),
        });
      }

      await batch.commit();

      return {
        added: addedIds.length,
        errors: errors.length,
        errorDetails: errors,
      };
    })
  );

// ── Review Absence Request ──────────────────────────────────────────────
export const adminReviewAbsenceRequest = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAdmin(async (data, _context, adminId) => {
      const { requestId, decision, reviewNote } = data;

      if (!requestId || !["approved", "rejected"].includes(decision)) {
        throw new functions.https.HttpsError("invalid-argument", "requestId và decision bắt buộc");
      }

      const requestRef = db.collection("absence_requests").doc(requestId);
      const requestSnap = await requestRef.get();

      if (!requestSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Đơn không tồn tại");
      }

      if (requestSnap.data()?.status !== "pending") {
        throw new functions.https.HttpsError("failed-precondition", "Đơn đã được xử lý");
      }

      await requestRef.update({
        status: decision,
        reviewedBy: adminId,
        reviewedAt: Date.now(),
        ...(reviewNote ? { reviewNote } : {}),
      });

      return { success: true };
    })
  );

// ── Create Admin Account (run once from Firebase Console) ───────────────
export const adminCreateAccount = functions
  .region("asia-southeast1")
  .https.onCall(
    requireAdmin(async (data) => {
      const { email, password, name } = data;

      if (!email || !password || !name) {
        throw new functions.https.HttpsError("invalid-argument", "email, password, name bắt buộc");
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      // Create Firestore user doc
      await db.collection("users").doc(userRecord.uid).set({
        name,
        avatar: "",
        role: "admin",
        email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { uid: userRecord.uid };
    })
  );
