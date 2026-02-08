"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// UPDATE AVATAR
// ---------------------------------------------------------------------------

export async function updateAvatar(avatarUrl: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  // Validate URL
  if (
    !avatarUrl.startsWith("/api/upload/") &&
    !/^https?:\/\/.+/.test(avatarUrl)
  ) {
    return { error: "Neplatná URL obrázku" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout"); // Refresh sidebar/nav avatar
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

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const position = (formData.get("position") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { error: "Jméno musí mít alespoň 2 znaky" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phone, position },
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("updateProfile error:", err);
    return { error: "Nepodařilo se aktualizovat profil" };
  }
}
