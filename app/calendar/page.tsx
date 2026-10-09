import { requireRole } from "@/lib/auth";
import { allLaunches, placements } from "@/lib/db";
import { todayISO } from "@/lib/plan";
import MonthCalendar from "@/components/MonthCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; brand?: string }> }) {
  await requireRole();
  const { m, brand } = await searchParams;
  const today = todayISO();
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : today.slice(0, 7);
  const [launches, ps] = await Promise.all([allLaunches(), placements()]);
  const brandId = brand ? Number(brand) : null;
  const shown = brandId ? ps.filter((p) => p.launch_id === brandId) : ps;
  const sorted = [...launches].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <h1>Calendar</h1>
      <p className="sub">All booked placements. Pick one brand to get its shareable monthly calendar (print or save as PDF).</p>
      <form className="row noprint" style={{ marginBottom: 14 }}>
        <input type="hidden" name="m" value={month} />
        <select name="brand" defaultValue={brand ?? ""} style={{ maxWidth: 280 }}>
          <option value="">All brands</option>
          {sorted.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button className="btn small">Show</button>
      </form>
      {brandId && <h2 style={{ marginTop: 0 }}>{launches.find((l) => l.id === brandId)?.name} · monthly calendar</h2>}
      <div className="card">
        <MonthCalendar
          month={month}
          placements={shown}
          launches={launches}
          showBrand={!brandId}
          today={today}
          basePath={`/calendar?${brandId ? `brand=${brandId}&` : ""}`}
        />
      </div>
    </>
  );
}
