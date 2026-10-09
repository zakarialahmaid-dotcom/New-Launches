"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clearRole, getRole, requireMarketing, roleForPasscode, setRole } from "@/lib/auth";
import { addDays, CHANNELS, diffDays, todayISO } from "@/lib/plan";

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const n = (f: FormData, k: string) => {
  const v = s(f, k);
  return v ? Math.min(4, Math.max(1, parseInt(v, 10))) || null : null;
};

async function requireAnyRole() {
  const r = await getRole();
  if (!r) redirect("/login");
  return r;
}

// ---------------- auth ----------------
export async function login(_: unknown, f: FormData) {
  const role = roleForPasscode(String(f.get("passcode") || ""));
  if (!role) return { error: "Wrong passcode" };
  await setRole(role);
  redirect("/");
}

export async function logout() {
  await clearRole();
  redirect("/login");
}

// ---------------- requests (commercial side) ----------------
function commercialFields(f: FormData) {
  return {
    name: s(f, "name"),
    level: s(f, "level"),
    launch_type: s(f, "launch_type"),
    category: s(f, "category"),
    kam: s(f, "kam"),
    requested_go_live: s(f, "requested_go_live"),
    stock_ready: f.get("stock_ready") === "yes",
    landing_page: s(f, "landing_page"),
    offer: s(f, "offer"),
    hero_skus: s(f, "hero_skus"),
    commercial_comments: s(f, "commercial_comments"),
  };
}

export async function createLaunch(f: FormData) {
  await requireAnyRole();
  const c = commercialFields(f);
  if (!c.name) throw new Error("Name is required");
  const sql = await db();
  const [row] = await sql`insert into launches ${sql(c)} returning id`;
  revalidatePath("/", "layout");
  redirect(`/launch/${row.id}`);
}

export async function updateCommercial(id: number, f: FormData) {
  await requireAnyRole();
  const c = commercialFields(f);
  if (!c.name) throw new Error("Name is required");
  const sql = await db();
  await sql`update launches set ${sql(c)}, updated_at = now() where id = ${id}`;
  revalidatePath("/", "layout");
}

// ---------------- marketing side ----------------
export async function updateMarketing(id: number, f: FormData) {
  await requireMarketing();
  const m = {
    decision: s(f, "decision"),
    confirmed_go_live: s(f, "confirmed_go_live"),
    m2_p1_week: n(f, "m2_p1_week"),
    m3_p1_week: n(f, "m3_p1_week"),
    marketing_owner: s(f, "marketing_owner"),
    marketing_comments: s(f, "marketing_comments"),
  };
  const sql = await db();
  await sql`update launches set ${sql(m)}, updated_at = now() where id = ${id}`;
  revalidatePath("/", "layout");
}

export async function deleteLaunch(id: number) {
  await requireMarketing();
  const sql = await db();
  await sql`delete from launches where id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/requests");
}

export async function addPlacements(launchId: number, f: FormData) {
  await requireMarketing();
  const from = s(f, "from");
  const to = s(f, "to") || from;
  const channel = s(f, "channel");
  if (!from || !channel || !(CHANNELS as readonly string[]).includes(channel)) throw new Error("Date and channel required");
  const days = Math.max(0, Math.min(90, diffDays(to!, from)));
  const rows = Array.from({ length: days + 1 }, (_, i) => ({
    launch_id: launchId,
    date: addDays(from, i),
    channel,
    time: s(f, "time"),
    details: s(f, "details"),
    owner: s(f, "owner"),
    status: "Planned",
  }));
  const sql = await db();
  await sql`insert into placements ${sql(rows)}`;
  revalidatePath("/", "layout");
}

export async function setPlacementStatus(id: number, status: string) {
  await requireMarketing();
  if (!["Planned", "Live", "Done", "Cancelled"].includes(status)) return;
  const sql = await db();
  await sql`update placements set status = ${status} where id = ${id}`;
  revalidatePath("/", "layout");
}

export async function deletePlacement(id: number) {
  await requireMarketing();
  const sql = await db();
  await sql`delete from placements where id = ${id}`;
  revalidatePath("/", "layout");
}

// ---------------- example data (October 2026 plan) ----------------
export async function seedExamples() {
  await requireMarketing();
  const sql = await db();
  const [{ count }] = await sql`select count(*)::int as count from launches`;
  if (count > 0) return;
  const today = todayISO();
  const d = (day: number) => `2026-10-${String(day).padStart(2, "0")}`;
  const note = "Imported from 'Brand new launches 360 plan' (Oct 2026).";
  const brands: {
    launch: Record<string, unknown>;
    plan: [string, number[], string?, string?][];
  }[] = [
    {
      launch: {
        name: "LC Waikiki", level: "Brand", launch_type: "Onboarding", category: "Fashion", kam: "Soufiane El byad",
        requested_go_live: d(1), stock_ready: true, decision: "Accepted", confirmed_go_live: d(1),
        landing_page: "https://www.jumia.ma/mlp-boutique-officielle-lc-waikiki/", marketing_comments: note,
      },
      plan: [
        ["Slider HP", [1, 2, 3, 4, 12, 13, 14]], ["PF Home page", [5, 6, 7, 8, 9, 10, 11]],
        ["PN full base", [1, 15], "16:00"], ["PN targeted", [8, 22], "16:00"], ["Social story", [8, 15]],
        ["Social reel", [14]], ["KOL", [1, 13, 22, 30]],
      ],
    },
    {
      launch: {
        name: "City Fashion", level: "Brand", category: "Fashion", requested_go_live: d(12), stock_ready: true,
        decision: "Accepted", confirmed_go_live: d(12), marketing_comments: `${note} Go-live = first placement date, please confirm.`,
      },
      plan: [
        ["Slider HP", [16, 17, 18]], ["PF Home page", [26, 27, 28]], ["PN targeted", [12, 13, 17]],
        ["PN targeted", [19, 26], undefined, "Fashion segment"], ["Social story", [16, 22, 29]],
        ["Social post", [22]], ["KOL", [16]],
      ],
    },
    {
      launch: {
        name: "Absolut New York", level: "Brand", requested_go_live: d(13), stock_ready: true, decision: "Accepted",
        confirmed_go_live: d(13), marketing_comments: `${note} Go-live = first placement date, please confirm.`,
      },
      plan: [
        ["Slider HP", [14, 16, 17, 18]], ["PF Home page", [19, 20, 21, 26, 27, 28]], ["PN targeted", [13, 15, 17]],
        ["Social story", [16, 22]], ["KOL", [16]],
      ],
    },
  ];
  for (const b of brands) {
    const [row] = await sql`insert into launches ${sql(b.launch)} returning id`;
    const rows = b.plan.flatMap(([channel, days, time, details]) =>
      days.map((day) => ({
        launch_id: row.id, date: d(day), channel, time: time ?? null, details: details ?? null,
        status: d(day) < today ? "Done" : "Planned", owner: null,
      }))
    );
    await sql`insert into placements ${sql(rows)}`;
  }
  revalidatePath("/", "layout");
}
