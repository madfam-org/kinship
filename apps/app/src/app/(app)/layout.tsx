"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@/lib/session';

const NAV_ITEMS = [
  { href: '/calendar',  label: 'Schedule',  icon: '📅' },
  { href: '/planning',  label: 'Planning',  icon: '📊' },
  { href: '/inventory', label: 'Inventory', icon: '📦' },
  { href: '/treasury',  label: 'Treasury',  icon: '💰' },
];

function NavBar() {
  const pathname = usePathname();
  return (
    <>
      {/* Top nav — visible on desktop */}
      <nav className="kinship-topnav" aria-label="Primary navigation">
        <div className="kinship-topnav__brand">
          <span className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Kinship
          </span>
        </div>
        <ul className="kinship-topnav__links">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`kinship-topnav__link${pathname.startsWith(href) ? ' kinship-topnav__link--active' : ''}`}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom nav — visible on mobile */}
      <nav className="kinship-bottomnav" aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`kinship-bottomnav__item${pathname.startsWith(href) ? ' kinship-bottomnav__item--active' : ''}`}
          >
            <span className="kinship-bottomnav__icon" aria-hidden="true">{icon}</span>
            <span className="kinship-bottomnav__label">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="kinship-shell">
        <NavBar />
        <main className="kinship-shell__content">
          {children}
        </main>
        {/* Spacer so bottom nav doesn't overlap content on mobile */}
        <div className="kinship-bottomnav-spacer" aria-hidden="true" />
      </div>
    </UserProvider>
  );
}
