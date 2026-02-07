"use server";

import { signIn, signOut } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(1, "Heslo je povinné"),
});

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: "Neplatné přihlašovací údaje" };
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error: unknown) {
    // NextAuth redirects throw NEXT_REDIRECT, which we should let through
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: "Nesprávný email nebo heslo" };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
