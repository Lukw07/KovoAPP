import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Test endpoint: creates a test in-app notification for the current user.
 * GET /api/cron/notifications/test
 *
 * This lets you verify notifications are working without needing
 * Firebase push setup.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const notification = await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: "SYSTEM",
      title: "🔔 Test notifikace",
      body: `Toto je testovací notifikace vytvořená ${new Date().toLocaleString("cs-CZ")}. Notifikace fungují správně!`,
      link: "/dashboard",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Test notification created. Check the bell icon.",
    notificationId: notification.id,
  });
}
