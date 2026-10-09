import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { history } from "@/lib/data";
import HistoryList from "@/components/HistoryList";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const user = await requireUser();
  const { who } = await searchParams;
  const mine = who === "me";
  const rows = await history({ actor: mine ? user.email : undefined, limit: 300 });
  return (
    <>
      <h1>History</h1>
      <p className="sub">Every request, decision, date change and booking, with who did it and when (latest 300).</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link className={`btn small ${mine ? "ghost" : ""}`} href="/history">Everyone</Link>
        <Link className={`btn small ${mine ? "" : "ghost"}`} href="/history?who=me">My activity</Link>
      </div>
      <HistoryList rows={rows} showLaunch />
    </>
  );
}
