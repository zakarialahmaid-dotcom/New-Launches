import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac } from "crypto";

export type Role = "commercial" | "marketing";
export type User = { email: string; role: Role };
const COOKIE = "launch_crm_user";

// Signing key for the login cookie. AUTH_SECRET is optional: without it, a key is derived from SHEETS_API_TOKEN.
const secret = () =>
  process.env.AUTH_SECRET ||
  createHash("sha256").update(`launch-crm:${process.env.SHEETS_API_TOKEN || "dev"}`).digest("hex");
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");

const list = (v: string | undefined, fallback: string) =>
  (v ?? fallback).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** Emails with the marketing role (env MARKETING_EMAILS, comma-separated). Everyone else is commercial. */
export const marketingEmails = () => list(process.env.MARKETING_EMAILS, "zakaria.lahmaid@jumia.com");
/** Allowed email domains (env ALLOWED_EMAIL_DOMAINS, comma-separated; empty = any domain). */
export const allowedDomains = () => list(process.env.ALLOWED_EMAIL_DOMAINS, "jumia.com");

export function roleFor(email: string): Role {
  return marketingEmails().includes(email.toLowerCase()) ? "marketing" : "commercial";
}

export function checkEmail(raw: string): { email?: string; error?: string } {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address" };
  const domains = allowedDomains();
  if (domains.length && !domains.includes(email.split("@")[1]))
    return { error: `Use your ${domains.map((d) => "@" + d).join(" or ")} email address` };
  return { email };
}

export async function signIn(email: string) {
  (await cookies()).set(COOKIE, `${email}|${sign(email)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const i = v.lastIndexOf("|");
  const email = v.slice(0, i);
  if (i < 1 || v.slice(i + 1) !== sign(email)) return null;
  return { email, role: roleFor(email) };
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireMarketing(): Promise<User> {
  const u = await getUser();
  if (u?.role !== "marketing") throw new Error("Marketing access required");
  return u;
}
