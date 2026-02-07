"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { MarketplaceCategory } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const createListingSchema = z.object({
  title: z.string().min(3, "Název musí mít alespoň 3 znaky").max(200),
  description: z.string().min(5, "Popis musí mít alespoň 5 znaků"),
  category: z.enum(["SELLING", "BUYING", "LOOKING_FOR", "OFFERING"]),
  price: z.string().max(50).optional(),
  imageUrl: z.string().url("Neplatná URL obrázku").optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// CREATE LISTING
// ---------------------------------------------------------------------------

export async function createListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    category: formData.get("category") as string,
    price: (formData.get("price") as string) || undefined,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.marketplaceListing.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category as MarketplaceCategory,
        price: parsed.data.price || null,
        imageUrl: parsed.data.imageUrl || null,
        authorId: session.user.id,
      },
    });

    revalidatePath("/marketplace");
    return { success: true };
  } catch (err) {
    console.error("createListing error:", err);
    return { error: "Nepodařilo se vytvořit inzerát" };
  }
}

// ---------------------------------------------------------------------------
// DEACTIVATE OWN LISTING
// ---------------------------------------------------------------------------

export async function deactivateListing(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) return { error: "Inzerát nenalezen" };
    if (listing.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return { error: "Nemáte oprávnění" };
    }

    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { isActive: false },
    });

    revalidatePath("/marketplace");
    return { success: true };
  } catch (err) {
    console.error("deactivateListing error:", err);
    return { error: "Nepodařilo se deaktivovat inzerát" };
  }
}

// ---------------------------------------------------------------------------
// DELETE LISTING (owner or Admin)
// ---------------------------------------------------------------------------

export async function deleteListing(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nepřihlášen" };

  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) return { error: "Inzerát nenalezen" };
    if (listing.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return { error: "Nemáte oprávnění" };
    }

    await prisma.marketplaceListing.delete({ where: { id: listingId } });

    revalidatePath("/marketplace");
    return { success: true };
  } catch (err) {
    console.error("deleteListing error:", err);
    return { error: "Nepodařilo se smazat inzerát" };
  }
}
