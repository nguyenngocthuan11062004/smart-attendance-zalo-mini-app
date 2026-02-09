// --- Zalo eKYC API types ---

export interface EKYCUploadResponse {
  error: number;
  message: string;
  data: string; // encrypted JSON string
}

export interface EKYCDecryptedUploadData {
  img: string; // image ID on Zalo eKYC server
}

export interface EKYCSanityCheckResponse {
  error: number;
  message: string;
  data: string; // encrypted JSON string
}

export interface EKYCDecryptedSanityData {
  result: {
    is_valid: boolean;
    issues: string[];
  };
}

export interface EKYCFaceMatchResponse {
  error: number;
  message: string;
  data: string; // encrypted JSON string
}

export interface EKYCDecryptedFaceMatchData {
  result: {
    match: "true" | "false";
    score: number; // 0-100
  };
}

// --- Internal types ---

export interface FaceRegistrationDoc {
  id: string;
  studentId: string;
  referenceImagePath: string; // Firebase Storage: "faces/{studentId}/reference.jpg"
  ekycImageId: string; // Zalo eKYC image ID for matching
  sanityCheckPassed: boolean;
  registeredAt: number;
  updatedAt: number;
}

export interface FaceVerificationResult {
  matched: boolean;
  confidence: number; // 0.0 - 1.0
  selfieImagePath: string;
  verifiedAt: number;
  error?: string;
  skipped?: boolean;
}
