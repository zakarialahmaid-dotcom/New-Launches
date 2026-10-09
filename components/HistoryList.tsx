import Link from "next/link";
import type { HistoryRow } from "@/lib/data";

const when = (d: string | Date) =>
  new Date(d).toLocaleString("en-GB", {
    timeZone: process.env.APP_TIMEZONE || "Africa/Casablanca",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const tone = (a: string) =>
  a.startsWith("Request created") ? "b-new" : a.startsWith("Scheduling") ? "b-live" : a.includes("deleted") || a.includes("removed") ? "b-off" : a.startsWith("Placement") ? "b-wait" : "b-done";

export default function HistoryList({ rows, showLaunch }: { rows: HistoryRow[]; showLaunch: boolean }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            {showLaunch && <th>Brand / seller / subcategory</th>}
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={showLaunch ? 5 : 4} className="empty">No activity yet.</td></tr>}
          {rows.map((h) => (
            <tr key={h.id}>
              <td style={{ whiteSpace: "nowrap" }}>{when(h.at)}</td>
              <td className="note">{h.actor}</td>
              {showLaunch && (
                <td>{h.launch_id ? <Link className="name" href={`/launch/${h.launch_id}`}>{h.launch_name}</Link> : h.launch_name}</td>
              )}
              <td><span className={`badge ${tone(h.action)}`}>{h.action}</span></td>
              <td>{h.details || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
