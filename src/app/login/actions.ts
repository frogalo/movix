"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export type AuthFormState = {
  error?: string;
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

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

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

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: existingUser.name ?? name,
        passwordHash,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/profile",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed. Try logging in." };
    }

    throw error;
  }

  return {};
}
