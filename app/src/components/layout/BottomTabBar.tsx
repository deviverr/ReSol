"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Browse", icon: BrowseIcon },
  { href: "/sell", label: "Sell", icon: SellIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
      <div className="glass-strong mx-auto flex max-w-md items-stretch justify-around rounded-3xl p-1.5">
        {TABS.map((t) => {
          const active = isActive(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition ${
                active
                  ? "glass-purple text-[var(--color-purple-700)]"
                  : "text-[var(--color-ink-soft)]"
              }`}
            >
              <Icon active={active} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <nav className="glass sticky top-24 hidden h-fit w-52 shrink-0 flex-col gap-1 rounded-3xl p-2 sm:flex">
      {TABS.map((t) => {
        const active = isActive(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              active
                ? "glass-purple text-[var(--color-purple-700)]"
                : "text-[var(--color-ink-soft)] hover:bg-white/60"
            }`}
          >
            <Icon active={active} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

type IconProps = { active?: boolean };
const stroke = (a?: boolean) => (a ? "var(--color-purple-600)" : "currentColor");

function BrowseIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={stroke(active)} strokeWidth="2" />
      <path d="M20 20l-3-3" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function SellIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ActivityIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 13h3l2 5 4-12 2 7h5"
        stroke={stroke(active)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ProfileIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={stroke(active)} strokeWidth="2" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
