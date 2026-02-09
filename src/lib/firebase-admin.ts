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
      // Fix common environment variable formatting issues caused by deployment tools
      serviceAccountJson = serviceAccountJson.trim();
      
      // Remove wrapping single quotes if present (e.g. '{"type":...}')
      if (serviceAccountJson.startsWith("'") && serviceAccountJson.endsWith("'")) {
        serviceAccountJson = serviceAccountJson.slice(1, -1);
      }
      
      // Remove wrapping double quotes if present (e.g. "{\"type\":...}")
      if (serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"')) {
        serviceAccountJson = serviceAccountJson.slice(1, -1);
      }

      // Handle unescaping of escaped quotes (e.g. {\"type\":...})
      // This happens if the JSON string was double-encoded or escaped by the shell
      if (serviceAccountJson.includes('\\"')) {
        serviceAccountJson = serviceAccountJson.replace(/\\"/g, '"');
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
