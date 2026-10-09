import "./globals.css";
import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import NavLinks from "@/components/NavLinks";
import { logout } from "./actions";

const ubuntu = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu", display: "swap" });

export const metadata: Metadata = {
  title: "New Launches CRM · Jumia",
  description: "Visibility plan for new and reactivated brands, sellers and subcategories",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en" className={ubuntu.variable}>
      <body>
        {user && (
          <header className="nav">
            <div className="nav-in">
              <Link href="/" className="brand" aria-label="Jumia · This week">
                <img src="/brand/jumia-logo-white.png" alt="Jumia" />
              </Link>
              <span className="app">New launches</span>
              <NavLinks />
              <span className="sp" />
              <Link className="btn small" href="/requests/new">+ New request</Link>
              <span className="me">
                <span className="who">{user.email}</span>
                <span className={`role role-${user.role}`}>{user.role}</span>
              </span>
              <form action={logout}>
                <button className="linkbtn">Sign out</button>
              </form>
            </div>
          </header>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
