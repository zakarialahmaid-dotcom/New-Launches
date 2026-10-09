import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allLaunches, placements } from "@/lib/db";
import { fmt, status, statusTone, todayISO } from "@/lib/plan";
import { seedExamples } from "../actions";

export const dynamic = "force-dynamic";

const FILTERS: Record<string, { label: string; test: (s: string) => boolean }> = {
  all: { label: "All", test: () => true },
  mine: { label: "My requests", test: () => true },
  new: { label: "New", test: (s) => s === "New request" },
  waiting: { label: "Waiting", test: (s) => s === "Waiting for stock" || s === "Go-live to confirm" },
  scheduled: { label: "Scheduled", test: (s) => s === "Scheduled" },
  live: { label: "Live", test: (s) => s.startsWith("Live") },
  done: { label: "Done", test: (s) => s === "Done" },
  off: { label: "On hold / rejected", test: (s) => s === "On hold" || s === "Rejected" },
};

export default async function Requests({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const user = await requireUser();
  const role = user.role;
  const { f = "all", q = "" } = await searchParams;
  const [launches, ps] = await Promise.all([allLaunches(), placements()]);
  const today = todayISO();
  const filt = FILTERS[f] ?? FILTERS.all;
  const rows = launches
    .map((l) => ({ l, s: status(l, today), n: ps.filter((p) => p.launch_id === l.id).length }))
    .filter(({ l, s }) => filt.test(s) && (f !== "mine" || l.created_by === user.email) && (!q || `${l.name} ${l.kam ?? ""} ${l.category ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <div className="row between">
        <div>
          <h1>Requests</h1>
          <p className="sub">Every new or reactivated brand, seller and subcategory. Commercial requests, marketing decides and schedules.</p>
        </div>
        <Link className="btn orange" href="/requests/new">+ New request</Link>
      </div>

      <form className="row" style={{ marginBottom: 12 }}>
        {Object.entries(FILTERS).map(([k, v]) => (
          <Link key={k} href={`/requests?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`btn small ${k === f ? "" : "ghost"}`}>{v.label}</Link>
        ))}
        <input type="hidden" name="f" value={f} />
        <input name="q" defaultValue={q} placeholder="Search brand, KAM, category…" style={{ maxWidth: 260, marginLeft: "auto" }} />
      </form>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Brand / seller / subcategory</th><th>Level</th><th>Type</th><th>Category</th><th>KAM</th>
              <th>Requested by</th><th>Requested</th><th>Confirmed go-live</th><th>Placements</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="empty">
                No requests here yet.
                {role === "marketing" && launches.length === 0 && (
                  <form action={seedExamples} style={{ marginTop: 10 }}>
                    <button className="btn ghost small">Load the October examples (LC Waikiki, City Fashion, Absolut New York)</button>
                  </form>
                )}
              </td></tr>
            )}
            {rows.map(({ l, s, n }) => (
              <tr key={l.id}>
                <td><Link className="name" href={`/launch/${l.id}`}>{l.name}</Link></td>
                <td>{l.level || "—"}</td>
                <td>{l.launch_type ? <span className="badge b-type">{l.launch_type}</span> : "—"}</td>
                <td>{l.category || "—"}</td>
                <td>{l.kam || "—"}</td>
                <td className="note">{l.created_by || "—"}</td>
                <td>{l.requested_go_live ? fmt(l.requested_go_live) : "—"}</td>
                <td>{l.confirmed_go_live ? fmt(l.confirmed_go_live) : "—"}</td>
                <td>{n}</td>
                <td><span className={`badge b-${statusTone(s)}`}>{s}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
