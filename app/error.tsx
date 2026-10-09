"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 620, margin: "8vh auto" }}>
      <h1>Something went wrong</h1>
      <p className="sub">The page could not load. This is almost always the connection to the Google Sheet.</p>
      <ol style={{ lineHeight: 1.7 }}>
        <li>Open <a href="/api/health">/api/health</a>: it shows the exact error.</li>
        <li>In Vercel, <code>SHEETS_API_URL</code> (the Apps Script web app URL ending in /exec) and <code>SHEETS_API_TOKEN</code> (same as TOKEN in the script) must be set.</li>
        <li>After any change in Vercel settings: <b>Deployments → Redeploy</b>.</li>
      </ol>
      {error.digest && <p className="note">Error reference: {error.digest}</p>}
      <button className="btn" onClick={() => reset()}>Try again</button>
    </div>
  );
}
