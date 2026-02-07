import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Firebase Admin SDK singleton for server-side push notifications.
 *
 * Requires FIREBASE_ADMIN_SDK_KEY env variable with the service account
 * JSON string, or GOOGLE_APPLICATION_CREDENTIALS pointing to a file.
 */
function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Option 1: JSON string in env
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch {
      console.warn("[firebase-admin] Failed to parse FIREBASE_ADMIN_SDK_KEY");
    }
  }

  // Option 2: GOOGLE_APPLICATION_CREDENTIALS file path (auto-detected)
  // Option 3: No credentials — graceful fallback
  console.warn(
    "[firebase-admin] No credentials found. Push notifications will be logged only.",
  );
  return null;
}

const adminApp = getAdminApp();

/**
 * Get Firebase Admin Messaging, or null if not configured.
 */
export function getAdminMessaging() {
  if (!adminApp) return null;
  return getMessaging(adminApp);
}
