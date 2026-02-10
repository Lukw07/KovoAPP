"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const sendMessageSchema = z.object({
  content: z.string().min(1, "Zpráva nesmí být prázdná").max(2000),
  receiverId: z.string().min(1),
  listingId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// SEND MESSAGE
// ---------------------------------------------------------------------------

export async function sendMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const raw = {
    content: formData.get("content") as string,
    receiverId: formData.get("receiverId") as string,
    listingId: (formData.get("listingId") as string) || undefined,
  };

  const parsed = sendMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.receiverId === session.user.id) {
    return { error: "Nemůžete psát sami sobě" };
  }

  try {
    const senderUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await prisma.message.create({
      data: {
        content: parsed.data.content,
        senderId: session.user.id,
        receiverId: parsed.data.receiverId,
        listingId: parsed.data.listingId || null,
      },
    });

    // Push notification to receiver
    await sendNotification({
      userId: parsed.data.receiverId,
      type: "NEW_MESSAGE",
      title: `Nová zpráva od ${senderUser?.name ?? "uživatele"}`,
      body: parsed.data.content.length > 100
        ? parsed.data.content.slice(0, 100) + "…"
        : parsed.data.content,
      link: "/messages",
    });

    // Instant realtime event for message UI update
    emitRealtimeEvent("message:new", parsed.data.receiverId, {
      senderId: session.user.id,
      senderName: senderUser?.name,
      preview: parsed.data.content.slice(0, 80),
    }).catch(() => {});

    revalidatePath("/messages");
    return { success: true };
  } catch (err) {
    console.error("sendMessage error:", err);
    return { error: "Nepodařilo se odeslat zprávu" };
  }
}

// ---------------------------------------------------------------------------
// GET CONVERSATIONS (list of all unique conversations)
// ---------------------------------------------------------------------------

export async function getConversations() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  // Get all messages where user is sender or receiver
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } },
      listing: { select: { id: true, title: true } },
    },
  });

  // Group by conversation partner
  const convMap = new Map<
    string,
    {
      partnerId: string;
      partnerName: string | null;
      partnerAvatar: string | null;
      lastMessage: string;
      lastMessageAt: Date;
      unreadCount: number;
      listingId: string | null;
      listingTitle: string | null;
    }
  >();

  for (const msg of messages) {
    const partnerId =
      msg.senderId === userId ? msg.receiverId : msg.senderId;
    const partner =
      msg.senderId === userId ? msg.receiver : msg.sender;

    // Use partnerId + listingId as unique key for separate conversation threads
    const key = `${partnerId}:${msg.listingId || "direct"}`;

    if (!convMap.has(key)) {
      convMap.set(key, {
        partnerId,
        partnerName: partner.name,
        partnerAvatar: partner.avatarUrl,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount: 0,
        listingId: msg.listingId,
        listingTitle: msg.listing?.title || null,
      });
    }

    // Count unread
    if (msg.receiverId === userId && !msg.isRead) {
      const conv = convMap.get(key)!;
      conv.unreadCount++;
    }
  }

  return Array.from(convMap.values()).sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
  );
}

// ---------------------------------------------------------------------------
// GET CONVERSATION MESSAGES (between current user and partner)
// ---------------------------------------------------------------------------

export async function getConversationMessages(
  partnerId: string,
  listingId?: string,
) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  const where = {
    OR: [
      { senderId: userId, receiverId: partnerId },
      { senderId: partnerId, receiverId: userId },
    ],
    ...(listingId ? { listingId } : {}),
  };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: {
      senderId: partnerId,
      receiverId: userId,
      isRead: false,
      ...(listingId ? { listingId } : {}),
    },
    data: { isRead: true },
  });

  return messages;
}

// ---------------------------------------------------------------------------
// GET UNREAD COUNT (for badge)
// ---------------------------------------------------------------------------

export async function getUnreadMessageCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return prisma.message.count({
    where: {
      receiverId: session.user.id,
      isRead: false,
    },
  });
}

// ---------------------------------------------------------------------------
// SEARCH USERS (for new conversation)
// ---------------------------------------------------------------------------

export async function searchUsers(query: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        { isActive: true },
        {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      position: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  return users;
}
