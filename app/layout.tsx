import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getRole } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "New Launches CRM",
  description: "Visibility plan for new and reactivated brands, sellers and subcategories",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();
  return (
    <html lang="en">
      <body>
        {role && (
          <nav className="nav">
            <div className="nav-in">
              <span className="brand">
                <b>Jumia</b> · New launches
              </span>
              <Link href="/">This week</Link>
              <Link href="/requests">Requests</Link>
              <Link href="/calendar">Calendar</Link>
              <Link href="/requests/new">+ New request</Link>
              <span className="sp" />
              <span className="role">{role}</span>
              <form action={logout}>
                <button className="linkbtn">Log out</button>
              </form>
            </div>
          </nav>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
