import * as functions from "firebase-functions";

// ekyc.service.ts đã bị xóa — face matching tạm thời chạy client-side qua
// face-api.js (xem src/services/face.service.ts). Các Cloud Function bên
// dưới được giữ làm stub để export trong index.ts không bị vỡ.
//
// TODO (production): Khi có Blaze plan + eKYC contract, khôi phục logic
// server-side để chống deepfake/replay attack.

export const registerFace = functions
  .region("asia-southeast1")
  .https.onCall(async () => {
    throw new functions.https.HttpsError(
      "unimplemented",
      "Face registration runs client-side. Enable Blaze plan + eKYC for server-side enrollment."
    );
  });

export const verifyFace = functions
  .region("asia-southeast1")
  .https.onCall(async () => {
    throw new functions.https.HttpsError(
      "unimplemented",
      "Face verification runs client-side. Enable Blaze plan + eKYC for server-side matching."
    );
  });
