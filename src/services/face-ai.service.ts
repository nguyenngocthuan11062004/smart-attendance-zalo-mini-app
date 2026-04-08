/**
 * Client-side face detection & recognition using face-api.js.
 * No server needed — runs entirely in the browser.
 *
 * Models used (total ~6.4MB, loaded once):
 * - TinyFaceDetector (190KB) — fast face detection
 * - FaceLandmark68TinyNet (75KB) — facial landmarks
 * - FaceRecognitionNet (6.1MB) — 128-dim face descriptor
 */
import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const MATCH_THRESHOLD = 0.6; // Euclidean distance < 0.6 = same person

/**
 * Load face-api models (called once, cached).
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

/**
 * Detect face and compute 128-dim descriptor from base64 image.
 * Returns null if no face detected.
 */
export async function detectFace(
  imageBase64: string
): Promise<{ descriptor: Float32Array; confidence: number } | null> {
  await loadModels();

  const img = await base64ToImage(imageBase64);
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    descriptor: detection.descriptor,
    confidence: detection.detection.score,
  };
}

/**
 * Compare two face descriptors.
 * Returns distance (lower = more similar) and whether they match.
 */
export function compareFaces(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): { distance: number; matched: boolean; confidence: number } {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  const matched = distance < MATCH_THRESHOLD;
  // Convert distance to confidence (0-1): closer to 0 distance = closer to 1 confidence
  const confidence = Math.max(0, Math.min(1, 1 - distance));
  return { distance, matched, confidence };
}

/**
 * Serialize Float32Array to regular array for Firestore storage.
 */
export function serializeDescriptor(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

/**
 * Deserialize array from Firestore back to Float32Array.
 */
export function deserializeDescriptor(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

/**
 * Check face quality: size, position, sharpness.
 */
export function checkFaceQuality(
  detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const box = detection.detection.box;
  const score = detection.detection.score;

  if (score < 0.7) issues.push("Khuôn mặt không rõ ràng");
  if (box.width < 80 || box.height < 80) issues.push("Khuôn mặt quá nhỏ, hãy lại gần hơn");
  if (box.width > 400) issues.push("Khuôn mặt quá gần, hãy lùi ra");

  return { ok: issues.length === 0, issues };
}

// --- Helpers ---

function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}
