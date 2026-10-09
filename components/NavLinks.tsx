"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "This week", match: (p: string) => p === "/" },
  { href: "/requests", label: "Requests", match: (p: string) => p.startsWith("/requests") || p.startsWith("/launch") },
  { href: "/calendar", label: "Calendar", match: (p: string) => p.startsWith("/calendar") },
  { href: "/history", label: "History", match: (p: string) => p.startsWith("/history") },
];

/** Top-nav links with the active page underlined in Jumia orange. */
export default function NavLinks() {
  const path = usePathname() || "/";
  return (
    <nav className="links">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={l.match(path) ? "on" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
