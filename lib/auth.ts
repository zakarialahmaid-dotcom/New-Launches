import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

export type Role = "commercial" | "marketing";
const COOKIE = "launch_crm_role";

const sign = (role: string) =>
  createHmac("sha256", process.env.AUTH_SECRET || "dev-secret-change-me").update(role).digest("hex");

export function roleForPasscode(code: string): Role | null {
  const eq = (a: string, b?: string) => {
    if (!b) return false;
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  if (eq(code, process.env.MARKETING_PASSCODE)) return "marketing";
  if (eq(code, process.env.COMMERCIAL_PASSCODE)) return "commercial";
  return null;
}

export async function setRole(role: Role) {
  (await cookies()).set(COOKIE, `${role}.${sign(role)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearRole() {
  (await cookies()).delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [role, sig] = v.split(".");
  if ((role === "commercial" || role === "marketing") && sig === sign(role)) return role;
  return null;
}

export async function requireRole(): Promise<Role> {
  const r = await getRole();
  if (!r) redirect("/login");
  return r;
}

export async function requireMarketing(): Promise<void> {
  if ((await getRole()) !== "marketing") throw new Error("Marketing access required");
}
