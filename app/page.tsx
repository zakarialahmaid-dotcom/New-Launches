import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allLaunches, placements } from "@/lib/data";
import {
  diffDays, fmt, missing, placementsInWeek, priority, status, statusTone, todayISO, weekOf, weekStart, whatToPush,
} from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function ThisWeek() {
  const { role } = await requireUser();
  const [launches, ps] = await Promise.all([allLaunches(), placements()]);
  const today = todayISO();

  const live = launches
    .filter((l) => l.decision === "Accepted" && l.stock_ready && weekOf(l, today))
    .map((l) => {
      const w = weekOf(l, today)!;
      return { l, w, p: priority(l, w), miss: missing(l, w, ps), booked: placementsInWeek(l, w, ps).length };
    })
    .sort((a, b) => a.p.localeCompare(b.p) || a.l.name.localeCompare(b.l.name));
  const newReq = launches.filter((l) => !l.decision);
  const waiting = launches.filter((l) => ["Waiting for stock", "Go-live to confirm"].includes(status(l, today)));
  const upcoming = launches
    .filter((l) => status(l, today) === "Scheduled" && diffDays(l.confirmed_go_live!, today) <= 21)
    .sort((a, b) => a.confirmed_go_live!.localeCompare(b.confirmed_go_live!));
  const gaps = live.filter((x) => x.miss.length).length;

  return (
    <>
      <h1>This week</h1>
      <p className="sub">
        {fmt(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · what to push for every live
        launch, and what is still missing.
      </p>

      <div className="kpis">
        <a className="kpi" href="#live"><div className="v">{live.length}</div><div className="l">Live launches · {live.filter((x) => x.p === "P1").length} in P1</div></a>
        <a className="kpi" href="#live"><div className="v" style={{ color: gaps ? "var(--warn)" : undefined }}>{gaps}</div><div className="l">Launches with gaps this week</div></a>
        <Link className="kpi" href="/requests?f=new"><div className="v">{newReq.length}</div><div className="l">New requests to review</div></Link>
        <Link className="kpi" href="/requests?f=waiting"><div className="v">{waiting.length}</div><div className="l">Waiting for stock / go-live date</div></Link>
      </div>

      <h2 id="live">Live this week</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Brand / seller / subcategory</th><th>Type</th><th>Week</th><th>Priority</th><th>What to push</th>
              <th>Booked</th><th>Still missing</th>
            </tr>
          </thead>
          <tbody>
            {live.length === 0 && <tr><td colSpan={7} className="empty">No live launch this week.</td></tr>}
            {live.map(({ l, w, p, miss, booked }) => (
              <tr key={l.id} className={p === "P1" ? "p1" : ""}>
                <td><Link className="name" href={`/launch/${l.id}`}>{l.name}</Link><div className="note">{l.kam || ""}</div></td>
                <td>{l.launch_type ? <span className="badge b-type">{l.launch_type}</span> : "—"}</td>
                <td>W{w}/12<div className="note">M{Math.ceil(w / 4)} · from {fmt(weekStart(l, w))}</div></td>
                <td><span className={`badge b-${p}`}>{p}</span></td>
                <td>{whatToPush(l, w)}</td>
                <td>{booked}</td>
                <td>{miss.length ? <span className="miss">{miss.join(" · ")}</span> : <span className="ok">All booked ✓</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="two" style={{ marginTop: 8 }}>
        <div>
          <h2>Going live in the next 3 weeks</h2>
          <div className="tablewrap">
            <table>
              <tbody>
                {upcoming.length === 0 && <tr><td className="empty">Nothing scheduled.</td></tr>}
                {upcoming.map((l) => (
                  <tr key={l.id}>
                    <td><Link className="name" href={`/launch/${l.id}`}>{l.name}</Link></td>
                    <td>{l.launch_type || "—"}</td>
                    <td>{fmt(l.confirmed_go_live!, { weekday: "short", day: "2-digit", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2>{role === "marketing" ? "Requests to review" : "Your requests waiting for marketing"}</h2>
          <div className="tablewrap">
            <table>
              <tbody>
                {[...newReq, ...waiting].length === 0 && <tr><td className="empty">Nothing pending.</td></tr>}
                {[...newReq, ...waiting].slice(0, 12).map((l) => {
                  const s = status(l, today);
                  return (
                    <tr key={l.id}>
                      <td><Link className="name" href={`/launch/${l.id}`}>{l.name}</Link></td>
                      <td>{l.requested_go_live ? `asked ${fmt(l.requested_go_live)}` : "—"}</td>
                      <td><span className={`badge b-${statusTone(s)}`}>{s}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="note" style={{ marginTop: 18 }}>
        Rules · Month 1: W1 P1, W2–W3 P2, W4 P1, Jforce &amp; CS challenge all month · Months 2–3: 3 weeks P2 + 1 week P1
        (chosen at the CP call) · P1 = slider, KOL, social, 3+ PN · P2 = product floor + PN.
      </p>
    </>
  );
}
