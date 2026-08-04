import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  redirect(user ? "/week" : "/login");
}
