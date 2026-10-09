import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allLaunches, getLaunch, history, placements } from "@/lib/db";
import {
  CHANNELS, fmt, GROUP_COLOR, GROUP_OF, missing, PLAN_WEEKS, placementsInWeek, priority, status, statusTone, todayISO,
  weekOf, weekStart,
} from "@/lib/plan";
import LaunchForm from "@/components/LaunchForm";
import MonthCalendar from "@/components/MonthCalendar";
import HistoryList from "@/components/HistoryList";
import {
  addPlacements, deleteLaunch, deletePlacement, setPlacementStatus, updateCommercial, updateMarketing,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function LaunchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { role } = await requireUser();
  const { id: idStr } = await params;
  const { m } = await searchParams;
  const id = Number(idStr);
  const l = Number.isFinite(id) ? await getLaunch(id) : null;
  if (!l) notFound();
  const [ps, launches, hist] = await Promise.all([placements(id), allLaunches(), history({ launchId: id })]);
  const today = todayISO();
  const st = status(l, today);
  const mkt = role === "marketing";
  const nowWeek = weekOf(l, today);
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : (l.confirmed_go_live && today < l.confirmed_go_live ? l.confirmed_go_live : today).slice(0, 7);

  return (
    <>
      <div className="row between">
        <div>
          <Link href="/requests" className="note noprint">← All requests</Link>
          <h1 style={{ marginTop: 6 }}>{l.name}</h1>
          <div className="row" style={{ marginBottom: 18 }}>
            <span className={`badge b-${statusTone(st)}`}>{st}</span>
            {l.launch_type && <span className="badge b-type">{l.launch_type}</span>}
            {l.level && <span className="badge b-type">{l.level}</span>}
            {l.category && <span className="badge b-type">{l.category}</span>}
            {l.kam && <span className="note">KAM: {l.kam}</span>}
            {l.created_by && <span className="note">· requested by {l.created_by}</span>}
          </div>
        </div>
        <div className="row noprint">
          <a className="btn ghost small" href={`/launch/${l.id}/export`}>Export CSV</a>
        </div>
      </div>

      <div className="two">
        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <span className="side-tag side-com">Commercial · request</span>
            <span className="note">Editable by both teams</span>
          </div>
          <LaunchForm action={updateCommercial.bind(null, l.id)} launch={l} submitLabel="Save request" />
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <span className="side-tag side-mkt">Marketing · scheduling</span>
            {!mkt && <span className="note">Read-only for commercial</span>}
          </div>
          <form action={updateMarketing.bind(null, l.id)} className="grid">
            <fieldset disabled={!mkt} style={{ display: "contents" }}>
              <div>
                <label>Decision</label>
                <select name="decision" defaultValue={l.decision ?? ""}>
                  <option value="">To review</option><option>Accepted</option><option>On hold</option><option>Rejected</option>
                </select>
              </div>
              <div>
                <label>Confirmed go-live (= week 1)</label>
                <input type="date" name="confirmed_go_live" defaultValue={l.confirmed_go_live ?? ""} />
              </div>
              <div>
                <label>Marketing owner</label>
                <input name="marketing_owner" defaultValue={l.marketing_owner ?? ""} />
              </div>
              <div>
                <label>Month 2 P1 week (CP call)</label>
                <select name="m2_p1_week" defaultValue={String(l.m2_p1_week ?? "")}>
                  <option value="">Week 4 (default)</option><option value="1">Week 1</option><option value="2">Week 2</option><option value="3">Week 3</option><option value="4">Week 4</option>
                </select>
              </div>
              <div>
                <label>Month 3 P1 week (CP call)</label>
                <select name="m3_p1_week" defaultValue={String(l.m3_p1_week ?? "")}>
                  <option value="">Week 4 (default)</option><option value="1">Week 1</option><option value="2">Week 2</option><option value="3">Week 3</option><option value="4">Week 4</option>
                </select>
              </div>
              <div />
              <div className="full">
                <label>Marketing comments</label>
                <textarea name="marketing_comments" defaultValue={l.marketing_comments ?? ""} />
              </div>
              {mkt && <div className="full"><button className="btn" style={{ background: "var(--blue)" }}>Save scheduling</button></div>}
            </fieldset>
          </form>
          {!l.stock_ready && <p className="note" style={{ marginTop: 12 }}>The plan starts once commercial sets “Stock fully available” to Yes.</p>}
        </div>
      </div>

      <h2>12-week visibility plan</h2>
      {l.confirmed_go_live ? (
        <div className="weeks">
          {Array.from({ length: PLAN_WEEKS }, (_, i) => {
            const w = i + 1;
            const p = priority(l, w);
            const miss = missing(l, w, ps);
            const n = placementsInWeek(l, w, ps).length;
            const past = weekStart(l, w) < today && w !== nowWeek;
            return (
              <div key={w} className={`wk ${p}${w === nowWeek ? " now" : ""}`}>
                <div className="t"><span>W{w}</span><span className={`badge b-${p}`}>{p}</span></div>
                <div className="m">M{Math.ceil(w / 4)} · {fmt(weekStart(l, w))}</div>
                <div style={{ marginTop: 4 }}>{n} booked</div>
                {miss.length > 0 && !past && <div className="miss" style={{ fontSize: 11 }}>Missing: {miss.join(", ")}</div>}
                {miss.length === 0 && <div className="ok" style={{ fontSize: 11 }}>Complete ✓</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card note">Marketing needs to confirm the go-live date to build the plan.</div>
      )}

      <h2>Placements</h2>
      {mkt && (
        <div className="card noprint" style={{ marginBottom: 12 }}>
          <form action={addPlacements.bind(null, l.id)} className="grid" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }}>
            <div><label>From *</label><input type="date" name="from" required /></div>
            <div><label>To (multi-day)</label><input type="date" name="to" /></div>
            <div>
              <label>Channel *</label>
              <select name="channel" required defaultValue="">
                <option value="" disabled>Choose…</option>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label>Time</label><input name="time" placeholder="16:00" /></div>
            <div><label>Details</label><input name="details" placeholder="segment, slot…" /></div>
            <div><label>Owner</label><input name="owner" /></div>
            <div className="full"><button className="btn" style={{ background: "var(--blue)" }}>Add placement</button>
              <span className="note" style={{ marginLeft: 10 }}>A date range adds one placement per day (sliders, product floors).</span></div>
          </form>
        </div>
      )}
      <div className="tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Week</th><th>Channel</th><th>Time</th><th>Details</th><th>Owner</th><th>Booked by</th><th>Status</th>{mkt && <th className="noprint" />}</tr></thead>
          <tbody>
            {ps.length === 0 && <tr><td colSpan={9} className="empty">No placement booked yet.</td></tr>}
            {ps.map((p) => {
              const w = weekOf(l, p.date);
              return (
                <tr key={p.id}>
                  <td>{fmt(p.date, { weekday: "short", day: "2-digit", month: "short" })}</td>
                  <td>{w ? <>W{w} <span className={`badge b-${priority(l, w)}`}>{priority(l, w)}</span></> : <span className="note">outside plan</span>}</td>
                  <td><span className="dot" style={{ background: GROUP_COLOR[GROUP_OF[p.channel]] }} />{p.channel}</td>
                  <td>{p.time || ""}</td>
                  <td>{p.details || ""}</td>
                  <td>{p.owner || ""}</td>
                  <td className="note">{p.created_by || ""}</td>
                  <td>
                    {mkt ? (
                      <form className="row" action={async (f: FormData) => { "use server"; await setPlacementStatus(p.id, String(f.get("s"))); }}>
                        <select name="s" defaultValue={p.status} style={{ width: 110, padding: "4px 6px" }}>
                          <option>Planned</option><option>Live</option><option>Done</option><option>Cancelled</option>
                        </select>
                        <button className="btn ghost small">Save</button>
                      </form>
                    ) : p.status}
                  </td>
                  {mkt && (
                    <td className="noprint">
                      <form action={deletePlacement.bind(null, p.id)}><button className="btn danger small">Delete</button></form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Calendar</h2>
      <div className="card">
        <MonthCalendar month={month} placements={ps} launches={launches} showBrand={false} today={today} basePath={`/launch/${l.id}?`} />
      </div>

      <h2>History</h2>
      <HistoryList rows={hist} showLaunch={false} />

      {mkt && (
        <form action={deleteLaunch.bind(null, l.id)} className="noprint" style={{ marginTop: 30 }}>
          <button className="btn danger small">Delete this request and its placements</button>
        </form>
      )}
    </>
  );
}
