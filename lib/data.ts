import { cache } from "react";
import type { Launch, Placement } from "./plan";

/**
 * Data layer: a Google Sheet (tabs Launches, Placements, History) behind a small Apps Script web app.
 * See apps-script/Code.gs and README.md for the 5-minute setup.
 */

export type HistoryRow = {
  id: number;
  launch_id: number | null;
  launch_name: string | null;
  actor: string;
  action: string;
  details: string | null;
  at: string;
};

export type Log = { actor: string; action: string; launch_id?: number | null; launch_name?: string | null; details?: string | null };

const API = process.env.SHEETS_API_URL?.trim();
const TOKEN = process.env.SHEETS_API_TOKEN?.trim();

type Raw = Record<string, string>;

async function call<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!API || !TOKEN) {
    throw new Error("Google Sheet not connected: set SHEETS_API_URL and SHEETS_API_TOKEN in Vercel, then redeploy.");
  }
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: TOKEN, action, ...payload }),
    redirect: "follow",
    cache: "no-store",
  });
  const text = await res.text();
  let json: { ok: boolean; error?: string } & T;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `The Google Sheet web app did not answer with JSON (HTTP ${res.status}). Check that SHEETS_API_URL is the ` +
        `"Web app" URL ending in /exec and that the deployment has access "Anyone".`
    );
  }
  if (!json.ok) throw new Error(`Google Sheet: ${json.error ?? "unknown error"}`);
  return json;
}

// ---------------- parsing (the sheet stores everything as text) ----------------
const str = (v: string | undefined) => (v === undefined || v === "" ? null : String(v));
const int = (v: string | undefined) => (v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
const bool = (v: string | undefined) => ["true", "yes", "1", "y", "oui"].includes(String(v ?? "").trim().toLowerCase());
const day = (v: string | undefined) => (v ? String(v).slice(0, 10) : null);

const toLaunch = (r: Raw): Launch => ({
  id: Number(r.id),
  name: r.name || "(no name)",
  level: str(r.level),
  launch_type: str(r.launch_type),
  category: str(r.category),
  kam: str(r.kam),
  requested_go_live: day(r.requested_go_live),
  stock_ready: bool(r.stock_ready),
  landing_page: str(r.landing_page),
  offer: str(r.offer),
  hero_skus: str(r.hero_skus),
  commercial_comments: str(r.commercial_comments),
  decision: str(r.decision),
  confirmed_go_live: day(r.confirmed_go_live),
  m2_p1_week: int(r.m2_p1_week),
  m3_p1_week: int(r.m3_p1_week),
  marketing_owner: str(r.marketing_owner),
  marketing_comments: str(r.marketing_comments),
  created_by: str(r.created_by),
  updated_by: str(r.updated_by),
  created_at: str(r.created_at) ?? undefined,
});

const toPlacement = (r: Raw): Placement => ({
  id: Number(r.id),
  launch_id: Number(r.launch_id),
  date: day(r.date) ?? "",
  channel: r.channel as Placement["channel"],
  time: str(r.time),
  details: str(r.details),
  status: r.status || "Planned",
  owner: str(r.owner),
  created_by: str(r.created_by),
});

const toHistory = (r: Raw): HistoryRow => ({
  id: Number(r.id),
  launch_id: int(r.launch_id),
  launch_name: str(r.launch_name),
  actor: r.actor,
  action: r.action,
  details: str(r.details),
  at: r.at,
});

// serialise values for the sheet
const out = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v)]));

// ---------------- reads (one round trip per page render) ----------------
const snapshot = cache(async () => {
  const r = await call<{ launches: Raw[]; placements: Raw[]; history: Raw[] }>("all", { historyLimit: 1000 });
  return {
    launches: r.launches.map(toLaunch).filter((l) => Number.isFinite(l.id)),
    placements: r.placements.map(toPlacement).filter((p) => Number.isFinite(p.id) && p.date),
    history: r.history.map(toHistory),
  };
});

export async function allLaunches(): Promise<Launch[]> {
  return [...(await snapshot()).launches].sort((a, b) => b.id - a.id);
}

export async function getLaunch(id: number): Promise<Launch | null> {
  return (await snapshot()).launches.find((l) => l.id === id) ?? null;
}

export async function placements(launchId?: number): Promise<Placement[]> {
  const ps = (await snapshot()).placements.filter((p) => !launchId || p.launch_id === launchId);
  return ps.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

export async function history(opts: { launchId?: number; actor?: string; limit?: number } = {}): Promise<HistoryRow[]> {
  return (await snapshot()).history
    .filter((h) => (!opts.launchId || h.launch_id === opts.launchId) && (!opts.actor || h.actor === opts.actor))
    .sort((a, b) => b.id - a.id)
    .slice(0, opts.limit ?? 200);
}

export async function health() {
  if (!API || !TOKEN) return { ok: false, error: "SHEETS_API_URL / SHEETS_API_TOKEN are not set in Vercel." };
  try {
    const r = await call<{ spreadsheet: string; counts: Record<string, number> }>("health");
    return { ok: true, spreadsheet: r.spreadsheet, counts: r.counts };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------- writes (each one also appends a History row, in the same call) ----------------
export async function insertLaunch(row: Record<string, unknown>, log: Log): Promise<number> {
  const r = await call<{ ids: number[] }>("insert", { table: "Launches", rows: [out(row)], log });
  return r.ids[0];
}

export async function updateLaunch(id: number, patch: Record<string, unknown>, log: Log) {
  await call("update", { table: "Launches", id, patch: out(patch), log });
}

export async function deleteLaunchRow(id: number, log: Log) {
  await call("delete", { table: "Launches", id, log });
}

export async function insertPlacements(rows: Record<string, unknown>[], log: Log) {
  await call("insert", { table: "Placements", rows: rows.map(out), log });
}

export async function updatePlacement(id: number, patch: Record<string, unknown>, log: Log) {
  await call("update", { table: "Placements", id, patch: out(patch), log });
}

export async function deletePlacementRow(id: number, log: Log) {
  await call("delete", { table: "Placements", id, log });
}
