"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const updateAvatarSchema = z.object({
  avatarUrl: z.string().refine(
    (val) => val.startsWith("/api/upload/") || /^https?:\/\/.+/.test(val),
    "Neplatná URL obrázku",
  ),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky").max(100),
  phone: z.string().max(20).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
});

// ---------------------------------------------------------------------------
// UPDATE AVATAR
// ---------------------------------------------------------------------------

export async function updateAvatar(avatarUrl: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const parsed = updateAvatarSchema.safeParse({ avatarUrl });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: parsed.data.avatarUrl },
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("updateAvatar error:", err);
    return { error: "Nepodařilo se aktualizovat avatar" };
  }
}

// ---------------------------------------------------------------------------
// UPDATE PROFILE (name, phone, position)
// ---------------------------------------------------------------------------

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const parsed = updateProfileSchema.safeParse({
    name: (formData.get("name") as string)?.trim(),
    phone: (formData.get("phone") as string)?.trim() || null,
    position: (formData.get("position") as string)?.trim() || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        position: parsed.data.position,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("updateProfile error:", err);
    return { error: "Nepodařilo se aktualizovat profil" };
  }
}
