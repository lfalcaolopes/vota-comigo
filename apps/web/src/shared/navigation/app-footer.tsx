import Link from "next/link";

import { SourceLink } from "@/shared/ui";

import { BrandMark } from "./brand-mark";

type FooterLink = {
  href: string;
  label: string;
};

type FooterGroup = {
  title: string;
  links: FooterLink[];
};

const groups: FooterGroup[] = [
  {
    title: "Navegar",
    links: [
      { href: "/proposicoes", label: "Proposições" },
      { href: "/deputados", label: "Deputados" },
      { href: "/matcher", label: "Fazer comparação" },
    ],
  },
  {
    title: "Entender",
    links: [
      { href: "/sobre", label: "Sobre" },
      { href: "/metodologia", label: "Metodologia" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-295 gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:gap-16 md:py-14">
        <div className="flex flex-col justify-between" >
          <div className="grid max-w-[40ch] content-start gap-3">
            <Link
              aria-label="Ir para o início"
              className="inline-flex items-center gap-3 rounded-md text-ink no-underline"
              href="/"
            >
              <BrandMark className="size-9 shrink-0" />
              <span className="text-lg font-[680] tracking-[-0.01em]">
                Quem Vota Comigo
              </span>
            </Link>
            <p className="text-sm leading-normal text-muted">
              Projeto independente, sem vínculo com a Câmara dos Deputados.
            </p>
          </div>
          <SourceLink
            href="https://dadosabertos.camara.leg.br/"
            rel="noreferrer"
            target="_blank"
          >
            Dados Abertos da Câmara dos Deputados
          </SourceLink>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:gap-16">
          {groups.map((group) => (
            <nav aria-label={group.title} key={group.title}>
              <p className="text-xs font-[680] text-subtle">{group.title}</p>
              <ul className="mt-3 grid gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-sm font-[600] text-muted underline-offset-2 transition-colors duration-[180ms] ease-standard hover:text-ink hover:underline"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
