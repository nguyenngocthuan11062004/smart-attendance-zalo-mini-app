/**
 * Seed script: Create the first admin account via Firebase REST API.
 * Run: node seed-admin.js
 */

const API_KEY = "AIzaSyB9DzDumnaYdyJA6LUpIq7vYSGiALlfTik";
const PROJECT_ID = "inhust-788e7";

const ADMIN_EMAIL = "admin@inhust.edu.vn";
const ADMIN_PASSWORD = "InHUST@2025";
const ADMIN_NAME = "Phòng Đào Tạo";

async function main() {
  try {
    // Step 1: Sign in (account already created)
    console.log("1. Signing in...");
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          returnSecureToken: true,
        }),
      }
    );
    const signInData = await signInRes.json();
    if (signInData.error) throw new Error(signInData.error.message);

    const uid = signInData.localId;
    const idToken = signInData.idToken;
    console.log(`   ✓ Signed in. UID: ${uid}`);

    // Step 2: Create Firestore document via PATCH (upsert with specific doc ID)
    console.log("2. Creating Firestore user document (role: admin)...");
    const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const firestoreRes = await fetch(
      `https://firestore.googleapis.com/v1/${docPath}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            name: { stringValue: ADMIN_NAME },
            avatar: { stringValue: "" },
            role: { stringValue: "admin" },
            email: { stringValue: ADMIN_EMAIL },
            createdAt: { integerValue: String(Date.now()) },
            updatedAt: { integerValue: String(Date.now()) },
          },
        }),
      }
    );

    const firestoreData = await firestoreRes.json();

    if (firestoreData.error) {
      console.log(`   ⚠ Error: ${firestoreData.error.message}`);
      console.log("   → Firestore rules block admin role from client.");
      console.log("   → Need to temporarily allow, or create via Firebase Console.\n");
    } else {
      console.log("   ✓ Firestore document created with role: admin");
    }

    console.log("\n========================================");
    console.log("  Admin account ready!");
    console.log("========================================");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  UID:      ${uid}`);
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
