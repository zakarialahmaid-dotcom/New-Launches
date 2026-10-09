// Visibility plan rules (as agreed by email) — pure functions, safe on server and client.
//
// Month 1: W1 P1 (360 push) · W2-W3 P2 · W4 P1
// Month 2 & 3: 3 weeks P2 + 1 week P1 (week chosen at the CP call, default week 4)
// P1: Slider HP, KOL, Social media, PN (min 3 / week)  ·  P2: Product floor (HP + cat page), PN
// Jforce & CS sales challenge: throughout month 1

export const CHANNELS = [
  "Slider HP",
  "PF Home page",
  "PF Cat page",
  "PN full base",
  "PN targeted",
  "KOL",
  "Social story",
  "Social reel",
  "Social post",
  "Jforce & CS challenge",
] as const;
export type Channel = (typeof CHANNELS)[number];

export type Group = "Homepage" | "Push notification" | "Social" | "KOL" | "Sales";
export const GROUP_OF: Record<Channel, Group> = {
  "Slider HP": "Homepage",
  "PF Home page": "Homepage",
  "PF Cat page": "Homepage",
  "PN full base": "Push notification",
  "PN targeted": "Push notification",
  KOL: "KOL",
  "Social story": "Social",
  "Social reel": "Social",
  "Social post": "Social",
  "Jforce & CS challenge": "Sales",
};
export const GROUP_COLOR: Record<Group, string> = {
  Homepage: "#ff9900",
  "Push notification": "#0057a3",
  Social: "#633185",
  KOL: "#20ac76",
  Sales: "#777777",
};

export const PLAN_WEEKS = 12;
export const P1_TEXT = "Slider HP · KOL · Social media · PN (min 3/week)";
export const P2_TEXT = "PF (Home + cat page) · PN";
export const CHALLENGE_TEXT = "Jforce & CS sales challenge";

// ---------- date helpers (ISO yyyy-mm-dd strings, UTC arithmetic) ----------
const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const addDays = (iso: string, n: number) =>
  new Date(toUTC(iso) + n * 86400000).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((toUTC(a) - toUTC(b)) / 86400000);
export const fmt = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) =>
  new Date(toUTC(iso)).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
export const weekday = (iso: string) => (new Date(toUTC(iso)).getUTCDay() + 6) % 7; // Mon=0

export function todayISO(tz = process.env.APP_TIMEZONE || "Africa/Casablanca") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
}

// ---------- plan ----------
export type Launch = {
  id: number;
  name: string;
  level: string | null;
  launch_type: string | null;
  category: string | null;
  kam: string | null;
  requested_go_live: string | null;
  stock_ready: boolean;
  landing_page: string | null;
  offer: string | null;
  hero_skus: string | null;
  commercial_comments: string | null;
  decision: string | null;
  confirmed_go_live: string | null;
  m2_p1_week: number | null;
  m3_p1_week: number | null;
  marketing_owner: string | null;
  marketing_comments: string | null;
  created_at?: string;
};

export type Placement = {
  id: number;
  launch_id: number;
  date: string;
  channel: Channel;
  time: string | null;
  details: string | null;
  status: string;
  owner: string | null;
};

export const isActive = (l: Launch) => l.decision === "Accepted" && l.stock_ready && !!l.confirmed_go_live;

export function weekOf(l: Launch, iso: string): number | null {
  if (!l.confirmed_go_live) return null;
  const d = diffDays(iso, l.confirmed_go_live);
  if (d < 0 || d >= PLAN_WEEKS * 7) return null;
  return Math.floor(d / 7) + 1;
}

export function priority(l: Launch, week: number): "P1" | "P2" {
  const m2 = l.m2_p1_week || 4;
  const m3 = l.m3_p1_week || 4;
  return [1, 4, 4 + m2, 8 + m3].includes(week) ? "P1" : "P2";
}

export const weekStart = (l: Launch, week: number) => addDays(l.confirmed_go_live!, (week - 1) * 7);

export function whatToPush(l: Launch, week: number) {
  const base = priority(l, week) === "P1" ? P1_TEXT : P2_TEXT;
  return week <= 4 ? `${base} · ${CHALLENGE_TEXT}` : base;
}

export function placementsInWeek(l: Launch, week: number, ps: Placement[]) {
  const s = weekStart(l, week);
  const e = addDays(s, 6);
  return ps.filter((p) => p.launch_id === l.id && p.status !== "Cancelled" && p.date >= s && p.date <= e);
}

export function missing(l: Launch, week: number, ps: Placement[]): string[] {
  const inWeek = placementsInWeek(l, week, ps);
  const n = (f: (c: Channel) => boolean) => inWeek.filter((p) => f(p.channel)).length;
  const pn = n((c) => c.startsWith("PN"));
  const out: string[] = [];
  if (priority(l, week) === "P1") {
    if (!n((c) => c === "Slider HP")) out.push("Slider");
    if (!n((c) => c === "KOL")) out.push("KOL");
    if (!n((c) => c.startsWith("Social"))) out.push("Social");
    if (pn < 3) out.push(`PN ${pn}/3`);
  } else {
    if (!n((c) => c.startsWith("PF"))) out.push("PF");
    if (!pn) out.push("PN");
  }
  if (week <= 4 && !n((c) => c === "Jforce & CS challenge")) out.push("Jforce & CS");
  return out;
}

export function status(l: Launch, today: string): string {
  if (!l.decision) return "New request";
  if (l.decision !== "Accepted") return l.decision;
  if (!l.stock_ready) return "Waiting for stock";
  if (!l.confirmed_go_live) return "Go-live to confirm";
  if (today < l.confirmed_go_live) return "Scheduled";
  const w = weekOf(l, today);
  return w ? `Live · week ${w}/12` : "Done";
}

export function statusTone(s: string): "new" | "wait" | "live" | "done" | "off" {
  if (s === "New request") return "new";
  if (s.startsWith("Live")) return "live";
  if (s === "Scheduled" || s === "Done") return "done";
  if (s === "Rejected" || s === "On hold") return "off";
  return "wait";
}
