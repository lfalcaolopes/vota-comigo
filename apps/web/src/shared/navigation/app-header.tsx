"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { ButtonLink, IconButton } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type NavItem = {
  href: string;
  label: string;
  matches: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/sobre",
    label: "Sobre",
    matches: (pathname) => pathname === "/sobre",
  },
  {
    href: "/metodologia",
    label: "Metodologia",
    matches: (pathname) => pathname === "/metodologia",
  },
  {
    href: "/deputados",
    label: "Deputados",
    matches: (pathname) => pathname.startsWith("/deputados"),
  },
  {
    href: "/",
    label: "Proposições",
    matches: (pathname) =>
      pathname === "/" || pathname.startsWith("/proposicoes"),
  },
];

export function AppHeader() {
  const pathname = usePathname();
  const menuId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white text-ink">
      <div className="mx-auto grid w-full max-w-295 gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6 md:py-2">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:block">
          <Brand />
          <IconButton
            aria-controls={menuId}
            aria-expanded={isMenuOpen}
            className="md:hidden"
            label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <MenuIcon open={isMenuOpen} />
          </IconButton>
        </div>

        <nav aria-label="Navegação principal" className="hidden min-w-0 md:block">
          <ul className="flex min-w-0 gap-0.5 overflow-x-auto pb-1 md:justify-center md:gap-1 md:overflow-visible md:pb-0">
            {navItems.map((item) => (
              <li className="shrink-0" key={item.href}>
                <NavLink active={item.matches(pathname)} href={item.href}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center justify-end gap-4 md:flex">
          <span aria-hidden="true" className="h-8 w-px bg-border" />
          <ButtonLink href="/matcher" variant="primary">
            Fazer comparação
          </ButtonLink>
        </div>

        <div
          className={joinClassNames(
            "gap-2 border-t border-border pt-3 md:hidden",
            isMenuOpen ? "grid" : "hidden",
          )}
          id={menuId}
        >
          <nav aria-label="Menu principal">
            <ul className="grid gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <MobileNavLink
                    active={item.matches(pathname)}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </MobileNavLink>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink
            className="mt-2 w-full justify-center"
            href="/matcher"
            onClick={() => setIsMenuOpen(false)}
            variant="primary"
          >
            Fazer comparação
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function Brand() {
  return (
    <Link
      aria-label="Ir para proposições"
      className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-3 rounded-md text-ink no-underline"
      href="/"
    >
      <BrandMark />
      <span className="hidden min-w-0 truncate text-xl font-[720] leading-tight tracking-[-0.02em] md:block">
        Quem Vota Comigo
      </span>
    </Link>
  );
}

function BrandMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-10 shrink-0"
      fill="none"
      viewBox="0 0 200 200"
    >
      <path
        d="M116 40H60C54.6957 40 49.6086 42.1071 45.8579 45.8579C42.1071 49.6086 40 54.6957 40 60V130L70 160H84"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="14"
      />
      <path
        d="M108 160V134"
        stroke="var(--color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="14"
      />
      <path
        d="M132 160V117"
        stroke="var(--color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="14"
      />
      <path
        d="M156 160V93"
        stroke="var(--color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="14"
      />
      <path
        d="M86.5 78.5L107.5 99.5L156 51"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="14"
      />
    </svg>
  );
}

function NavLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={joinClassNames(
        "relative inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-[650] leading-[1.2] text-muted no-underline transition-[background-color,color] duration-[180ms] ease-standard hover:bg-surface-muted hover:text-ink md:px-3",
        "after:absolute after:right-2.5 after:bottom-0 after:left-2.5 after:h-0.75 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-[180ms] after:ease-standard md:after:right-3 md:after:left-3",
        active
          ? "bg-white text-ink after:scale-x-100"
          : "after:scale-x-0 hover:after:scale-x-100",
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  active,
  children,
  href,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={joinClassNames(
        "flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-[650] text-muted no-underline transition-colors duration-[180ms] ease-standard hover:bg-surface-muted hover:text-ink",
        active && "bg-primary-soft text-ink",
      )}
      href={href}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 20 20"
      width="24"
    >
      {open ? (
        <path
          d="m5.5 5.5 9 9m0-9-9 9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.1"
        />
      ) : (
        <path
          d="M4 6.25h12M4 10h12M4 13.75h12"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.1"
        />
      )}
    </svg>
  );
}
