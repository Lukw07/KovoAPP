"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createJobSchema = z.object({
  title: z.string().min(3, "Název musí mít alespoň 3 znaky").max(200),
  description: z.string().min(10, "Popis musí mít alespoň 10 znaků"),
  requirements: z.string().optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  contractType: z.string().optional(),
  referralBonus: z.coerce.number().int().min(0).default(0),
  closesAt: z.string().optional(), // ISO date
});

const referralSchema = z.object({
  jobPostingId: z.string().min(1),
  candidateName: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  candidateEmail: z.string().email("Neplatný email").optional().or(z.literal("")),
  candidatePhone: z.string().optional(),
  note: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// CREATE JOB POSTING (Admin only)
// ---------------------------------------------------------------------------

export async function createJobPosting(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN") {
    return { error: "Nemáte oprávnění vytvářet inzeráty" };
  }

  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    requirements: (formData.get("requirements") as string) || undefined,
    location: (formData.get("location") as string) || undefined,
    salaryRange: (formData.get("salaryRange") as string) || undefined,
    contractType: (formData.get("contractType") as string) || undefined,
    referralBonus: formData.get("referralBonus") as string,
    closesAt: (formData.get("closesAt") as string) || undefined,
  };

  const parsed = createJobSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.jobPosting.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        requirements: parsed.data.requirements || null,
        location: parsed.data.location || null,
        salaryRange: parsed.data.salaryRange || null,
        contractType: parsed.data.contractType || null,
        referralBonus: parsed.data.referralBonus,
        closesAt: parsed.data.closesAt
          ? new Date(parsed.data.closesAt)
          : null,
        status: "ACTIVE",
        publishedAt: new Date(),
      },
    });

    revalidatePath("/jobs");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("createJobPosting error:", err);
    return { error: "Nepodařilo se vytvořit inzerát" };
  }
}

// ---------------------------------------------------------------------------
// UPDATE JOB STATUS (Admin only)
// ---------------------------------------------------------------------------

export async function updateJobStatus(
  jobId: string,
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "FILLED"
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN") {
    return { error: "Nemáte oprávnění" };
  }

  try {
    await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        status,
        publishedAt: status === "ACTIVE" ? new Date() : undefined,
      },
    });

    revalidatePath("/jobs");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("updateJobStatus error:", err);
    return { error: "Nepodařilo se změnit stav inzerátu" };
  }
}

// ---------------------------------------------------------------------------
// DELETE JOB POSTING (Admin only)
// ---------------------------------------------------------------------------

export async function deleteJobPosting(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };
  if (session.user.role !== "ADMIN") {
    return { error: "Nemáte oprávnění" };
  }

  try {
    await prisma.jobPosting.delete({ where: { id: jobId } });
    revalidatePath("/jobs");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("deleteJobPosting error:", err);
    return { error: "Nepodařilo se smazat inzerát" };
  }
}

// ---------------------------------------------------------------------------
// SUBMIT REFERRAL
// ---------------------------------------------------------------------------

export async function submitReferral(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const raw = {
    jobPostingId: formData.get("jobPostingId") as string,
    candidateName: formData.get("candidateName") as string,
    candidateEmail: (formData.get("candidateEmail") as string) || undefined,
    candidatePhone: (formData.get("candidatePhone") as string) || undefined,
    note: (formData.get("note") as string) || undefined,
  };

  const parsed = referralSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    // Verify job is active
    const job = await prisma.jobPosting.findUnique({
      where: { id: parsed.data.jobPostingId },
    });
    if (!job) return { error: "Inzerát nenalezen" };
    if (job.status !== "ACTIVE") return { error: "Inzerát není aktivní" };

    await prisma.referral.create({
      data: {
        candidateName: parsed.data.candidateName,
        candidateEmail: parsed.data.candidateEmail || null,
        candidatePhone: parsed.data.candidatePhone || null,
        note: parsed.data.note || null,
        referrerId: session.user.id,
        jobPostingId: parsed.data.jobPostingId,
      },
    });

    revalidatePath("/jobs");
    return { success: true };
  } catch (err) {
    console.error("submitReferral error:", err);
    return { error: "Nepodařilo se odeslat doporučení" };
  }
}
