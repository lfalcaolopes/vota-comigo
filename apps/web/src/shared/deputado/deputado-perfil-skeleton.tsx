import { Skeleton } from "@/shared/ui";

export function DeputadoPerfilSkeleton() {
  return (
    <div
      aria-label="Carregando perfil do deputado"
      className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-0"
      role="status"
    >
      <header className="grid gap-4 lg:col-start-1 lg:row-start-1 lg:pr-8">
        <Skeleton className="size-20 rounded-full md:size-24" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-6 w-52 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
      </header>

      <div className="grid content-start gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border lg:pl-8">
        <section className="grid gap-3">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-md md:h-14" />
          <Skeleton className="h-4 w-56 rounded-full" />
          <Skeleton className="h-3 w-64 rounded-full" />
        </section>

        <section className="grid gap-3 border-t border-border pt-6">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-4 w-44 rounded-full" />
          <Skeleton className="h-4 w-40 rounded-full" />
        </section>
      </div>

      <aside className="grid gap-6 lg:col-start-1 lg:row-start-2 lg:pr-8">
        <section className="grid gap-3 border-t border-border pt-6">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
        </section>

        <section className="grid gap-3 border-t border-border pt-6">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </section>
      </aside>
    </div>
  );
}
