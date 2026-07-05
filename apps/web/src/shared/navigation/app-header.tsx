"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useMountTransition } from "@/shared/hooks/use-mount-transition";
import { ButtonLink, IconButton } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { BrandMark } from "./brand-mark";

const MENU_TRANSITION_MS = 200;

type NavItem = {
  href: string;
  label: string;
  matches: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
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
    href: "/proposicoes",
    label: "Proposições",
    matches: (pathname) => pathname.startsWith("/proposicoes"),
  },
];

export function AppHeader() {
  const pathname = usePathname();
  const menuId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isMounted, isVisible } = useMountTransition(
    isMenuOpen,
    MENU_TRANSITION_MS,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Move focus into the menu when it opens so keyboard and screen-reader
  // users land inside the overlay rather than behind it.
  useEffect(() => {
    if (!isMenuOpen || !isMounted) return;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    firstFocusable?.focus();
  }, [isMenuOpen, isMounted]);

  // Lock body scroll, close on Escape, and trap Tab within the panel.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-white text-ink">
        <div className="mx-auto grid w-full max-w-295 gap-3 px-4 py-1 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6 md:py-2">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:block">
            <Brand />
            <IconButton
              aria-controls={menuId}
              aria-expanded={isMenuOpen}
              className="md:hidden border-0 px-2.5!"
              label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setIsMenuOpen((current) => !current)}
              ref={menuButtonRef}
              variant="ghost"
            >
              <MenuIcon open={isMenuOpen} />
            </IconButton>
          </div>

          <nav
            aria-label="Navegação principal"
            className="hidden min-w-0 md:block"
          >
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
        </div>

        {isMounted && (
          <div
            className={joinClassNames(
              "absolute inset-x-0 top-full origin-top border-b border-border bg-white shadow-popover transition-[opacity,transform] duration-200 ease-standard md:hidden",
              isVisible
                ? "translate-y-0 opacity-100"
                : "-translate-y-2 opacity-0",
            )}
            id={menuId}
            ref={panelRef}
          >
            <div className="mx-auto grid w-full max-w-295 gap-3 px-4 py-3">
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
                className="w-full justify-center"
                href="/matcher"
                onClick={() => setIsMenuOpen(false)}
                variant="primary"
              >
                Fazer comparação
              </ButtonLink>
            </div>
          </div>
        )}
      </header>

      {isMounted && (
        <button
          aria-hidden="true"
          className={joinClassNames(
            "fixed inset-0 z-30 bg-ink/40 transition-opacity duration-200 ease-standard md:hidden",
            isVisible ? "opacity-100" : "opacity-0",
          )}
          onClick={closeMenu}
          tabIndex={-1}
          type="button"
        />
      )}
    </>
  );
}

function Brand() {
  return (
    <Link
      aria-label="Ir para o início"
      className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-3 justify-self-start rounded-md text-ink no-underline"
      href="/"
    >
      <BrandMark />
      <span className="hidden min-w-0 truncate text-xl font-[720] leading-tight tracking-[-0.02em] md:block">
        Quem Vota Comigo
      </span>
    </Link>
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
      height="20"
      viewBox="4 4 12 12"
      width="20"
    >
      {open ? (
        <path
          d="m5.5 5.5 9 9m0-9-9 9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.3"
        />
      ) : (
        <path
          d="M4 6.25h12M4 10h12M4 13.75h12"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.3"
        />
      )}
    </svg>
  );
}
