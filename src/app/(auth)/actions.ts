"use server";

import { signIn, signOut } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimitAsync, LOGIN_LIMITER } from "@/lib/rate-limit";

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

    // Rate limit by email to prevent brute-force (Redis-backed for cross-instance)
    const rateCheck = await checkRateLimitAsync(LOGIN_LIMITER, parsed.data.email.toLowerCase());
    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.resetInMs / 60_000);
      return {
        error: `Příliš mnoho pokusů o přihlášení. Zkuste to znovu za ${minutes} min.`,
      };
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error: unknown) {
    // NextAuth redirects throw NEXT_REDIRECT, which we should let through
    const err = error as Error & { digest?: string; type?: string; code?: string };

    // Pass through Next.js redirect errors (must re-throw)
    if (
      err.digest?.startsWith("NEXT_REDIRECT") ||
      err.message?.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    // CredentialsSignin — in production the class name is minified,
    // so check the `type` / `code` properties and case-insensitive message.
    if (
      err.type === "CredentialsSignin" ||
      err.code === "credentials" ||
      err.name === "CredentialsSignin" ||
      err.message?.toLowerCase().includes("credentialssignin")
    ) {
      return { error: "Nesprávný email nebo heslo" };
    }

    console.error("Login error:", error);
    return { error: "Došlo k chybě při přihlášení" };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
