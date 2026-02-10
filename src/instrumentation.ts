/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * We use this to auto-start the Socket.IO server inside the same process
 * as Next.js, so there's nothing extra to launch — `npm run dev` or
 * `node server.js` (Docker) starts everything.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (Node.js runtime), not Edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[INIT] 🚀 Spouštím embedded Socket.IO server...");

    // Dynamic import to avoid bundling socket.io in the client/edge builds
    const { startSocketServer } = await import("@/lib/socket-io-server");
    startSocketServer();
  }
}
