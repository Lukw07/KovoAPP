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
  let serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_KEY;

  if (serviceAccountJson) {
    try {
      // Robust JSON extraction strategies for various environment variable misconfigurations:
      // 1. Direct match first (finding { and })
      const firstOpen = serviceAccountJson.indexOf("{");
      const lastClose = serviceAccountJson.lastIndexOf("}");

      if (firstOpen !== -1 && lastClose !== -1) {
        serviceAccountJson = serviceAccountJson.substring(firstOpen, lastClose + 1);
      }

      // 2. Handle escaped double quotes (e.g. {\"type\":...}) often added by Docker/Shell
      if (serviceAccountJson.includes('\\"')) {
        serviceAccountJson = serviceAccountJson.replace(/\\"/g, '"');
      }

      // 3. Handle double-escaped newlines in private key if present (\\n -> \n)
      if (serviceAccountJson.includes('\\\\n')) {
        serviceAccountJson = serviceAccountJson.replace(/\\\\n/g, '\\n');
      }

      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.warn("[firebase-admin] Failed to parse FIREBASE_ADMIN_SDK_KEY:", error);
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
