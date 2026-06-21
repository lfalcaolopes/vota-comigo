## Backend HTTP module structure

Use this convention for HTTP modules in `apps/api/src/`. It does not apply rigidly to ingestion pipeline modules, which may use pipeline-specific folders.

HTTP modules should keep only framework entrypoints at the module root:

```txt
modulo/
  modulo.module.ts
  modulo.controller.ts
  modulo.service.ts
  modulo.repository.ts
```

Move implementation details into folders by responsibility, creating a folder only when it has real files:

- `controller`: HTTP concerns only: routes, query/body extraction, HTTP exceptions, and delegation to the service.
- `service`: orchestrates the module flow: repositories, local rules, mappers, and public response contracts.
- `repository`: database access and query row shapes. Repository row types stay next to the repository unless they become broader module concepts.
- `dto/`: Nest request/query/body DTOs, pipes, or validation-facing input shapes.
- `mappers/`: transformations from internal shapes to public response contracts from `@vota-comigo/shared-types`.
- `rules/`: local application/domain rules, such as ranking, eligibility, search semantics, and pagination normalization.
- `types/`: internal module contracts shared by more than one file in the module; not a dumping ground for every TypeScript type.
- `errors/`, `validators/`, `guards/`, `constants/`: only when the module needs those responsibilities.
- `tests/`: module specs. Tests describe behavior, not file placement, and keep AAA section markers.
