"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setDisplayMode(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "1";
  const store = await cookies();

  if (enabled) {
    store.set("displayMode", "1", { httpOnly: true, sameSite: "lax", path: "/" });
  } else {
    store.delete("displayMode");
  }

  revalidatePath("/", "layout");
}
