import type { DeputadoPerfil } from "@vota-comigo/shared-types";

import { siteUrl } from "@/shared/lib/site";

import { buildDeputadoHref } from "./deputado-url";
import { nomePublicoLabel } from "./presentation";

export function buildDeputadoJsonLd(deputado: DeputadoPerfil) {
  const nome = nomePublicoLabel(deputado);
  const canonicalPath = buildDeputadoHref(deputado.externalIdDeputado, nome);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: nome,
    jobTitle: "Deputado federal",
    url: `${siteUrl}${canonicalPath}`,
    sameAs: [deputado.fonteOficial],
    ...(deputado.snapshotPublico?.siglaPartido
      ? {
          affiliation: {
            "@type": "Organization",
            name: deputado.snapshotPublico.siglaPartido,
          },
        }
      : {}),
    ...(deputado.snapshotPublico?.siglaUf
      ? {
          homeLocation: {
            "@type": "AdministrativeArea",
            name: deputado.snapshotPublico.siglaUf,
          },
        }
      : {}),
  };
}
