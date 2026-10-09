import Link from "next/link";
import { addDays, fmt, GROUP_COLOR, GROUP_OF, type Launch, type Placement, weekday } from "@/lib/plan";

const LABEL: Record<string, string> = {
  "Slider HP": "Homepage slider",
  "PF Home page": "Product floor HP",
  "PF Cat page": "Product floor cat",
  "PN full base": "Push notification",
  "PN targeted": "Push notification",
  KOL: "KOL post",
  "Social story": "Story",
  "Social reel": "Reel",
  "Social post": "Post",
  "Jforce & CS challenge": "Jforce & CS",
};

function sub(p: Placement) {
  const parts: string[] = [];
  if (p.time) parts.push(p.time);
  if (p.channel === "PN full base") parts.push("Full base");
  if (p.channel === "PN targeted") parts.push("Targeted");
  if (p.details) parts.push(p.details);
  return parts.join(" · ");
}

/** Simple monthly calendar: white boxes, coloured dot per channel group. */
export default function MonthCalendar({
  month, // "YYYY-MM"
  placements,
  launches,
  showBrand,
  today,
  basePath,
}: {
  month: string;
  placements: Placement[];
  launches: Launch[];
  showBrand: boolean;
  today: string;
  basePath: string; // e.g. "/calendar?brand=3&" — month param appended
}) {
  const first = `${month}-01`;
  const start = addDays(first, -weekday(first));
  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const lastDay = addDays(`${next}-01`, -1);
  const weeks = Math.ceil((weekday(first) + Number(lastDay.slice(8))) / 7);
  const name = Object.fromEntries(launches.map((l) => [l.id, l.name]));
  const byDate: Record<string, Placement[]> = {};
  for (const p of placements) (byDate[p.date] ||= []).push(p);

  return (
    <div>
      <div className="cal-head">
        <div className="row">
          <Link className="btn ghost small noprint" href={`${basePath}m=${prev}`}>‹</Link>
          <strong style={{ fontSize: 17, minWidth: 150, textAlign: "center" }}>
            {fmt(first, { month: "long", year: "numeric" })}
          </strong>
          <Link className="btn ghost small noprint" href={`${basePath}m=${next}`}>›</Link>
        </div>
        <div className="legend">
          {Object.entries(GROUP_COLOR).map(([g, c]) => (
            <span key={g}><span className="dot" style={{ background: c }} />{g}</span>
          ))}
        </div>
      </div>
      <div className="cal">
        {["MON", "TUES", "WED", "THURS", "FRI", "SAT", "SUN"].map((d) => <div key={d} className="dow">{d}</div>)}
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const d = addDays(start, i);
          const inMonth = d.slice(0, 7) === month;
          return (
            <div key={d} className={`day${inMonth ? "" : " out"}${d === today ? " today" : ""}`}>
              <div className="n">{d.slice(8) === "01" || !inMonth ? fmt(d) : Number(d.slice(8))}</div>
              {inMonth && (byDate[d] || []).map((p) => (
                <div key={p.id} className={`ev${p.status === "Cancelled" ? " cancel" : ""}`}>
                  <span className="dot" style={{ background: GROUP_COLOR[GROUP_OF[p.channel]] || "#999" }} />
                  <b>{showBrand ? `${name[p.launch_id] ?? "?"} · ` : ""}{LABEL[p.channel] ?? p.channel}</b>
                  {sub(p) && <div className="d">{sub(p)}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
