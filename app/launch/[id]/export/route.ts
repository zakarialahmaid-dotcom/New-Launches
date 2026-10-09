import { getUser } from "@/lib/auth";
import { getLaunch, placements } from "@/lib/db";
import { priority, weekOf } from "@/lib/plan";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) return new Response("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  const l = await getLaunch(id);
  if (!l) return new Response("Not found", { status: 404 });
  const ps = await placements(id);
  const lines = [
    ["Brand", "Type", "Date", "Week", "Priority", "Channel", "Time", "Details", "Owner", "Status"].join(","),
    ...ps.map((p) => {
      const w = weekOf(l, p.date);
      return [l.name, l.launch_type, p.date, w ?? "", w ? priority(l, w) : "", p.channel, p.time, p.details, p.owner, p.status]
        .map(esc)
        .join(",");
    }),
  ];
  const file = `${l.name.replace(/[^a-z0-9]+/gi, "_")}_placements.csv`;
  return new Response("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"` },
  });
}
