"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";

export type ActionState = { error?: string } | undefined;

export async function setupAdmin(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    return {
      error:
        "Please enter a name, a valid email, and a password of at least 8 characters.",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN", color: "#f97316" },
  });

  await createSession({ userId: user.id, role: "ADMIN" });
  redirect("/week");
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "Please enter your email." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid email or password." };
  }

  // Members an admin set up without a password can sign in with just their
  // email — an intentional convenience tradeoff for a private family app.
  // Lockout only applies to the password check below — there's no password
  // to guess for a passwordless account, so nothing to rate-limit there.
  if (user.passwordHash) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return {
        error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      if (attempts >= LOCKOUT_THRESHOLD) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000),
          },
        });
        return {
          error: `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
        };
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts },
      });
      return { error: "Invalid email or password." };
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/week");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
