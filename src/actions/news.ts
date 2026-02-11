"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendPushToAll } from "@/lib/notifications";
import { emitRealtimeEvent } from "@/lib/socket-server";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createPostSchema = z.object({
  title: z.string().min(3, "Nadpis musí mít alespoň 3 znaky").max(200),
  content: z.string().min(10, "Obsah musí mít alespoň 10 znaků"),
  excerpt: z.string().max(300).optional(),
  imageUrl: z
    .string()
    .refine(
      (val) =>
        val === "" ||
        val.startsWith("/api/upload/") ||
        /^https?:\/\/.+/.test(val),
      "Neplatná URL obrázku",
    )
    .optional()
    .or(z.literal("")),
  isPinned: z.boolean().optional().default(false),
  allowComments: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

const addCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1, "Komentář nesmí být prázdný").max(2000),
  parentId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// CREATE POST (Admin/Manager only)
// ---------------------------------------------------------------------------

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění vytvářet příspěvky" };
  }

  const raw = {
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    excerpt: (formData.get("excerpt") as string) || undefined,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    isPinned: formData.get("isPinned") === "true",
    allowComments: formData.get("allowComments") !== "false",
    tags: formData.getAll("tags").map(String).filter(Boolean),
  };

  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { tags, ...postData } = parsed.data;

  try {
    // Upsert tags
    const tagRecords = await Promise.all(
      tags.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    await prisma.post.create({
      data: {
        ...postData,
        imageUrl: postData.imageUrl || null,
        excerpt: postData.excerpt || null,
        authorId: session.user.id,
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
    });

    // Broadcast push notification to all users (topic-like)
    await sendPushToAll(
      "📰 Nový příspěvek",
      postData.title,
      "/news",
    );

    // Realtime activity event for dashboard feed
    emitRealtimeEvent("news:published", "all", {
      title: postData.title,
      link: "/news",
    }).catch(() => {});

    revalidatePath("/news");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("createPost error:", err);
    return { error: "Nepodařilo se vytvořit příspěvek" };
  }
}

// ---------------------------------------------------------------------------
// DELETE POST (Admin / Manager)
// ---------------------------------------------------------------------------

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění mazat příspěvky" };
  }

  try {
    await prisma.post.delete({ where: { id: postId } });

    emitRealtimeEvent("news:published", "all", {
      action: "deleted",
      postId,
    }).catch(() => {});

    revalidatePath("/news");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("deletePost error:", err);
    return { error: "Nepodařilo se smazat příspěvek" };
  }
}

// ---------------------------------------------------------------------------
// TOGGLE PIN (Admin / Manager)
// ---------------------------------------------------------------------------

export async function togglePinPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění" };
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return { error: "Příspěvek nenalezen" };

    await prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });

    emitRealtimeEvent("news:published", "all", {
      action: "pinned",
      postId,
    }).catch(() => {});

    revalidatePath("/news");
    return { success: true };
  } catch (err) {
    console.error("togglePinPost error:", err);
    return { error: "Nepodařilo se změnit stav připnutí" };
  }
}

// ---------------------------------------------------------------------------
// ADD COMMENT
// ---------------------------------------------------------------------------

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const raw = {
    postId: formData.get("postId") as string,
    content: formData.get("content") as string,
    parentId: (formData.get("parentId") as string) || undefined,
  };

  const parsed = addCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: parsed.data.postId },
    });
    if (!post) return { error: "Příspěvek nenalezen" };
    if (!post.allowComments) return { error: "Komentáře jsou zakázány" };

    await prisma.comment.create({
      data: {
        content: parsed.data.content,
        authorId: session.user.id,
        postId: parsed.data.postId,
        parentId: parsed.data.parentId || null,
      },
    });

    emitRealtimeEvent("news:published", "all", {
      action: "comment",
      postId: parsed.data.postId,
    }).catch(() => {});

    revalidatePath("/news");
    return { success: true };
  } catch (err) {
    console.error("addComment error:", err);
    return { error: "Nepodařilo se přidat komentář" };
  }
}
