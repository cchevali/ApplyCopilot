"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/setup", label: "Setup" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-lg font-semibold text-ink">
            ApplyCopilot
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            {links.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    active ? "bg-slate-100 text-ink" : "text-slate-600"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}
