import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { CotaLegislaturaResponse } from '@vota-comigo/shared-types';

import { createTtlCache } from '@/shared/cache/ttl-cache';

import { COTA_REPOSITORY, type CotaRepository } from './cota.repository';
import { toCotaLegislaturaResponse } from './mappers/cota-legislatura.mapper';
import { deriveJanelaCotaLegislatura } from './rules/janela-cota-legislatura';
import { selectLegislaturaAtual } from './rules/legislatura-atual';

// O agregado varre a legislatura inteira e só muda quando a ingestão avança a
// cobertura; a home é dinâmica e pediria a mesma varredura a cada visita.
const TTL_MS = 60 * 60 * 1_000;
const CACHE_KEY = 'legislatura';

@Injectable()
export class CotaService {
  private readonly cache = createTtlCache<CotaLegislaturaResponse>({
    ttlMs: TTL_MS,
    maxEntries: 1,
  });

  constructor(
    @Inject(COTA_REPOSITORY)
    private readonly repository: CotaRepository,
  ) {}

  async legislatura(): Promise<CotaLegislaturaResponse> {
    const cached = this.cache.get(CACHE_KEY);
    if (cached !== undefined) {
      return cached;
    }

    const response = await this.aggregate();
    this.cache.set(CACHE_KEY, response);
    return response;
  }

  private async aggregate(): Promise<CotaLegislaturaResponse> {
    const referencia = new Date().toISOString().slice(0, 10);
    const [legislaturas, coberturas, categorias] = await Promise.all([
      this.repository.loadLegislaturas(),
      this.repository.loadCoberturas(),
      this.repository.loadCategorias(),
    ]);

    const legislatura = selectLegislaturaAtual(legislaturas, referencia);
    if (legislatura === null) {
      throw new NotFoundException('agregado da cota indisponivel');
    }

    const janela = deriveJanelaCotaLegislatura({
      legislatura,
      coberturas,
      referencia,
    });
    if (janela === null) {
      throw new NotFoundException('agregado da cota indisponivel');
    }

    const years = [...new Set(janela.mesesCobertos.map((mes) => mes.year))];
    const [gastos, gastosSigepa] = await Promise.all([
      this.repository.loadGastos(years),
      this.repository.loadGastosSigepa(years),
    ]);

    return toCotaLegislaturaResponse({
      legislatura,
      janela,
      coberturas,
      categorias,
      gastos,
      gastosSigepa,
    });
  }
}
