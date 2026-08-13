"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { VerifyEmailEmail } from "@/emails/VerifyEmailEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import { z } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createElement } from "react";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

const registerSchema = loginSchema
  .extend({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or fewer."),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsedValues = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedValues.success) {
    return { error: getValidationMessage(parsedValues.error) };
  }

  try {
    await signIn("credentials", {
      ...parsedValues.data,
      redirectTo: "/profile",
    });
  } catch (error) {
    // Always re-throw Next.js redirect errors — they are not real errors
    if (isRedirectError(error)) throw error;

    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }

      return { error: "Unable to sign in right now." };
    }

    throw error;
  }

  return {};
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsedValues = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsedValues.success) {
    return { error: getValidationMessage(parsedValues.error) };
  }

  const { name, email, password } = parsedValues.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser?.passwordHash) {
    return { error: "An account with that email already exists." };
  }

  let userId: string;

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: existingUser.name ?? name,
        passwordHash,
      },
    });
    userId = updated.id;
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
    userId = created.id;
  }

  // Send verification email (fire-and-forget — don't block sign-in)
  try {
    await sendVerificationEmail(userId, email, name);
  } catch (err) {
    console.error("[Movix] Failed to send verification email:", err);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/profile",
    });
  } catch (error) {
    // Always re-throw Next.js redirect errors — they are not real errors
    if (isRedirectError(error)) throw error;

    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed. Try logging in." };
    }

    throw error;
  }

  return {};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendVerificationEmail(userId: string, email: string, name: string) {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h
  const record = await prisma.emailVerificationToken.create({
    data: { userId, expires },
  });

  const verifyUrl = `${getBaseUrl()}/verify-email?token=${record.token}`;

  await sendEmail({
    to: email,
    subject: "Confirm your Movix account",
    react: createElement(VerifyEmailEmail, { userName: name, verifyUrl }),
  });
}

// ─── Resend verification email (authenticated) ────────────────────────────────

export async function resendVerificationAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const userId = formData.get("userId") as string | null;
  const email = formData.get("email") as string | null;
  const name = formData.get("name") as string | null;

  if (!userId || !email) {
    return { error: "Unable to resend — please try again." };
  }

  try {
    await sendVerificationEmail(userId, email, name ?? "there");
    return { success: "Verification email sent! Check your inbox." };
  } catch (err) {
    console.error("[Movix] resendVerification error:", err);
    return { error: "Failed to send verification email. Try again later." };
  }
}

// ─── Forgot password ──────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: getValidationMessage(parsed.error) };
  }

  const { email } = parsed.data;

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.passwordHash) {
    try {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 h
      const record = await prisma.passwordResetToken.create({
        data: { userId: user.id, expires },
      });

      const resetUrl = `${getBaseUrl()}/reset-password?token=${record.token}`;

      await sendEmail({
        to: email,
        subject: "Reset your Movix password",
        react: createElement(PasswordResetEmail, { userName: user.name ?? "there", resetUrl }),
      });
    } catch (err) {
      console.error("[Movix] forgotPassword error:", err);
    }
  }

  return {
    success:
      "If an account with that email exists, we've sent a reset link. Check your inbox.",
  };
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: getValidationMessage(parsed.error) };
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record) {
    return { error: "This reset link is invalid." };
  }

  if (record.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return { error: "This reset link has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  // Invalidate the token
  await prisma.passwordResetToken.delete({ where: { id: record.id } });

  return { success: "Password updated! You can now log in with your new password." };
}
