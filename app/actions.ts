"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  deleteLaunchRow, deletePlacementRow, getLaunch, insertLaunch, insertPlacements, placements, updateLaunch, updatePlacement, allLaunches,
} from "@/lib/data";
import { checkEmail, getUser, requireMarketing, signIn, signOut, type User } from "@/lib/auth";
import { addDays, CHANNELS, diffDays, fmt, todayISO, type Launch } from "@/lib/plan";

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const n = (f: FormData, k: string) => {
  const v = s(f, k);
  return v ? Math.min(4, Math.max(1, parseInt(v, 10))) || null : null;
};

async function requireAnyUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

const LABELS: Record<string, string> = {
  name: "Name", level: "Level", launch_type: "Onboarding/reactivation", category: "Category", kam: "KAM",
  requested_go_live: "Requested go-live", stock_ready: "Stock ready", landing_page: "Landing page", offer: "Offer/CPR",
  hero_skus: "Hero SKUs", commercial_comments: "Commercial comments", decision: "Decision",
  confirmed_go_live: "Confirmed go-live", m2_p1_week: "M2 P1 week", m3_p1_week: "M3 P1 week",
  marketing_owner: "Marketing owner", marketing_comments: "Marketing comments",
};
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : v === true ? "Yes" : v === false ? "No" : String(v));
function changes(before: Launch, after: Record<string, unknown>) {
  return Object.entries(after)
    .filter(([k, v]) => show((before as Record<string, unknown>)[k]) !== show(v))
    .map(([k, v]) => {
      const long = k.endsWith("comments") || k === "hero_skus" || k === "landing_page";
      return long ? `${LABELS[k] ?? k} updated` : `${LABELS[k] ?? k}: ${show((before as Record<string, unknown>)[k])} → ${show(v)}`;
    })
    .join(" · ");
}

// ---------------- sign in ----------------
export async function login(_: unknown, f: FormData) {
  const { email, error } = checkEmail(String(f.get("email") || ""));
  if (!email) return { error: error ?? "Invalid email" };
  await signIn(email);
  redirect("/");
}

export async function logout() {
  await signOut();
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
  const u = await requireAnyUser();
  const c = commercialFields(f);
  if (!c.name) throw new Error("Name is required");
  const id = await insertLaunch({ ...c, created_by: u.email, updated_by: u.email }, {
    actor: u.email, action: "Request created", launch_name: c.name,
    details: [c.launch_type, c.category, c.requested_go_live ? `go-live asked ${fmt(c.requested_go_live)}` : null].filter(Boolean).join(" · "),
  });
  revalidatePath("/", "layout");
  redirect(`/launch/${id}`);
}

export async function updateCommercial(id: number, f: FormData) {
  const u = await requireAnyUser();
  const before = await getLaunch(id);
  if (!before) return;
  const c = commercialFields(f);
  if (!c.name) throw new Error("Name is required");
  const diff = changes(before, c);
  if (!diff) return;
  await updateLaunch(id, { ...c, updated_by: u.email }, { actor: u.email, action: "Request updated", launch_id: id, launch_name: c.name, details: diff });
  revalidatePath("/", "layout");
}

// ---------------- marketing side ----------------
export async function updateMarketing(id: number, f: FormData) {
  const u = await requireMarketing();
  const before = await getLaunch(id);
  if (!before) return;
  const m = {
    decision: s(f, "decision"),
    confirmed_go_live: s(f, "confirmed_go_live"),
    m2_p1_week: n(f, "m2_p1_week"),
    m3_p1_week: n(f, "m3_p1_week"),
    marketing_owner: s(f, "marketing_owner"),
    marketing_comments: s(f, "marketing_comments"),
  };
  const diff = changes(before, m);
  if (!diff) return;
  await updateLaunch(id, { ...m, updated_by: u.email }, { actor: u.email, action: "Scheduling updated", launch_id: id, launch_name: before.name, details: diff });
  revalidatePath("/", "layout");
}

export async function deleteLaunch(id: number) {
  const u = await requireMarketing();
  const l = await getLaunch(id);
  if (!l) return;
  await deleteLaunchRow(id, { actor: u.email, action: "Request deleted", launch_name: l.name });
  revalidatePath("/", "layout");
  redirect("/requests");
}

export async function addPlacements(launchId: number, f: FormData) {
  const u = await requireMarketing();
  const l = await getLaunch(launchId);
  if (!l) return;
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
    created_by: u.email,
  }));
  await insertPlacements(rows, {
    actor: u.email, action: "Placement booked", launch_id: l.id, launch_name: l.name,
    details: `${channel} · ${fmt(from)}${days ? ` → ${fmt(rows[rows.length - 1].date)} (${rows.length} days)` : ""}${rows[0].time ? ` · ${rows[0].time}` : ""}`,
  });
  revalidatePath("/", "layout");
}

export async function setPlacementStatus(id: number, status: string) {
  const u = await requireMarketing();
  if (!["Planned", "Live", "Done", "Cancelled"].includes(status)) return;
  const p = (await placements()).find((x) => x.id === id);
  if (!p || p.status === status) return;
  const l = await getLaunch(p.launch_id);
  await updatePlacement(id, { status }, {
    actor: u.email, action: "Placement status", launch_id: p.launch_id, launch_name: l?.name ?? null,
    details: `${p.channel} · ${fmt(p.date)}: ${p.status} → ${status}`,
  });
  revalidatePath("/", "layout");
}

export async function deletePlacement(id: number) {
  const u = await requireMarketing();
  const p = (await placements()).find((x) => x.id === id);
  if (!p) return;
  const l = await getLaunch(p.launch_id);
  await deletePlacementRow(id, {
    actor: u.email, action: "Placement removed", launch_id: p.launch_id, launch_name: l?.name ?? null, details: `${p.channel} · ${fmt(p.date)}`,
  });
  revalidatePath("/", "layout");
}

// ---------------- example data (October 2026 plan) ----------------
export async function seedExamples() {
  const u = await requireMarketing();
  if ((await allLaunches()).length > 0) return;
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
    const name = String(b.launch.name);
    const id = await insertLaunch({ ...b.launch, created_by: u.email, updated_by: u.email }, {
      actor: u.email, action: "Imported example", launch_name: name, details: "From the October 'Brand new launches 360 plan'",
    });
    const rows = b.plan.flatMap(([channel, days, time, details]) =>
      days.map((day) => ({
        launch_id: id, date: d(day), channel, time: time ?? null, details: details ?? null,
        status: d(day) < today ? "Done" : "Planned", owner: null, created_by: u.email,
      }))
    );
    await insertPlacements(rows, { actor: u.email, action: "Placement booked", launch_id: id, launch_name: name, details: `${rows.length} placements imported` });
  }
  revalidatePath("/", "layout");
}
