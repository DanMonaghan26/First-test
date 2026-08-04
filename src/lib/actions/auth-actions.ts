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

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/week");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
