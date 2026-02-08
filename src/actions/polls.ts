"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createPollSchema = z.object({
  question: z.string().min(5, "Otázka musí mít alespoň 5 znaků").max(500),
  description: z.string().max(2000).optional(),
  options: z
    .array(z.string().min(1, "Možnost nesmí být prázdná"))
    .min(2, "Anketa musí mít alespoň 2 možnosti")
    .max(10, "Maximálně 10 možností"),
  isAnonymous: z.boolean().optional().default(false),
  isMultiple: z.boolean().optional().default(false),
  activeUntil: z.string().optional(), // ISO date string
});

const voteSchema = z.object({
  pollId: z.string().min(1),
  optionIndex: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// CREATE POLL (Admin/Manager only)
// ---------------------------------------------------------------------------

export async function createPoll(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění vytvářet ankety" };
  }

  const options = formData.getAll("options").map(String).filter(Boolean);
  const raw = {
    question: formData.get("question") as string,
    description: (formData.get("description") as string) || undefined,
    options,
    isAnonymous: formData.get("isAnonymous") === "true",
    isMultiple: formData.get("isMultiple") === "true",
    activeUntil: (formData.get("activeUntil") as string) || undefined,
  };

  const parsed = createPollSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    // Convert string options to JSON array of { index, text }
    const optionsJson = parsed.data.options.map((text, index) => ({
      index,
      text,
    }));

    await prisma.poll.create({
      data: {
        question: parsed.data.question,
        description: parsed.data.description || null,
        options: optionsJson,
        isAnonymous: parsed.data.isAnonymous,
        isMultiple: parsed.data.isMultiple,
        activeUntil: parsed.data.activeUntil
          ? new Date(parsed.data.activeUntil)
          : null,
        creatorId: session.user.id,
      },
    });

    revalidatePath("/polls");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("createPoll error:", err);
    return { error: "Nepodařilo se vytvořit anketu" };
  }
}

// ---------------------------------------------------------------------------
// VOTE IN POLL (prevents double voting)
// ---------------------------------------------------------------------------

export async function voteInPoll(pollId: string, optionIndex: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const parsed = voteSchema.safeParse({ pollId, optionIndex });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    // Fetch the poll
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) return { error: "Anketa nenalezena" };
    if (!poll.isActive) return { error: "Anketa je ukončena" };
    if (poll.activeUntil && new Date() > poll.activeUntil) {
      return { error: "Anketa vypršela" };
    }

    // Validate option index
    const options = poll.options as Array<{ index: number; text: string }>;
    if (optionIndex < 0 || optionIndex >= options.length) {
      return { error: "Neplatná možnost" };
    }

    // Check for existing vote(s)
    if (!poll.isMultiple) {
      const existingVote = await prisma.pollVote.findFirst({
        where: { pollId, userId: session.user.id },
      });
      if (existingVote) {
        return { error: "V této anketě jste již hlasoval/a" };
      }
    } else {
      // For multiple-choice, check this specific option
      const existingOptionVote = await prisma.pollVote.findUnique({
        where: {
          pollId_userId_optionIndex: {
            pollId,
            userId: session.user.id,
            optionIndex,
          },
        },
      });
      if (existingOptionVote) {
        return { error: "Tuto možnost jste již zvolil/a" };
      }
    }

    await prisma.pollVote.create({
      data: {
        pollId,
        userId: session.user.id,
        optionIndex,
      },
    });

    revalidatePath("/polls");
    return { success: true };
  } catch (err) {
    console.error("voteInPoll error:", err);
    return { error: "Nepodařilo se zaznamenat hlas" };
  }
}

// ---------------------------------------------------------------------------
// CLOSE POLL (Admin / Manager)
// ---------------------------------------------------------------------------

export async function closePoll(pollId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: "Nemáte oprávnění" };
  }

  try {
    await prisma.poll.update({
      where: { id: pollId },
      data: { isActive: false },
    });

    revalidatePath("/polls");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("closePoll error:", err);
    return { error: "Nepodařilo se ukončit anketu" };
  }
}
