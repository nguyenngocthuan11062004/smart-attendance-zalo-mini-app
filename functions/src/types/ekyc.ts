// --- Zalo eKYC API types (fiza.ai) ---

export interface EKYCUploadResponse {
  code: number;
  message: string;
  data: string; // encrypted base64
  sign?: string;
  request_id?: string;
}

export interface EKYCDecryptedUploadData {
  photo_id: number;
}

export interface EKYCSanityCheckResponse {
  code: number;
  message: string;
  data: string; // encrypted base64
  sign?: string;
}

export interface EKYCDecryptedSanityData {
  result: {
    is_valid: boolean;
    issues: string[];
  };
}

export interface EKYCFaceMatchResponse {
  code: number;
  message: string;
  data: string; // encrypted base64
  sign?: string;
  request_id?: string;
}

export interface EKYCDecryptedFaceMatchData {
  status: number;
  msg: string;
  issame: boolean;
  prob: number; // 0.0 - 1.0
}

export interface EKYCOCRResponse {
  code: number;
  message: string;
  data: string; // encrypted base64
  sign?: string;
  request_id?: string;
}

export interface EKYCDecryptedOCRData {
  id_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality?: string;
  place_of_origin?: string;
  place_of_residence?: string;
  date_of_expiry?: string;
  id_type?: string;
}

// --- Internal types ---

export interface FaceRegistrationDoc {
  id: string;
  studentId: string;
  referenceImagePath: string; // Firebase Storage: "faces/{studentId}/reference.jpg"
  ekycImageId: string; // eKYC photo_id or "pending"
  sanityCheckPassed: boolean;
  cccdFrontPath?: string;
  cccdBackPath?: string;
  ocrData?: Record<string, any>;
  faceMatchConfidence?: number;
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
