import "server-only";
import { headers } from "next/headers";

// The app's own externally-reachable base URL, derived from the incoming
// request rather than an env var — works the same on Vercel, a custom
// domain, or a home-LAN address without needing to be configured anywhere.
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol =
    headersList.get("x-forwarded-proto") ??
    (process.env.COOKIE_SECURE === "true" ? "https" : "http");
  return `${protocol}://${host}`;
}
