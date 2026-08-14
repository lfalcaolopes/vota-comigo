import { Skeleton } from "@/shared/ui";

export function DeputadoPerfilSkeleton() {
  return (
    <div
      aria-label="Carregando perfil do deputado"
      className="grid gap-10 md:gap-12"
      role="status"
    >
      <header className="grid gap-5 border-b border-border pb-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-6 md:pb-10 lg:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,0.75fr)] lg:gap-8">
        <Skeleton className="size-20 rounded-full md:size-24" />
        <div className="grid gap-3">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-9 w-64 max-w-full rounded-md" />
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-full" />
        </div>
        <div className="grid content-start gap-3 border-t border-border pt-5 sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-4/5 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
        </div>
      </header>

      <div className="-mt-6 -mb-2 flex min-h-15 items-center gap-3 border-b border-border py-2 md:-mt-8">
        <Skeleton className="h-11 w-28 rounded-md" />
        <Skeleton className="h-11 w-24 rounded-md" />
        <Skeleton className="h-11 w-24 rounded-md" />
      </div>

      <section className="grid gap-6">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
          <div className="grid gap-3 lg:pr-10">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-9 w-56 rounded-md" />
            <Skeleton className="h-4 w-full max-w-md rounded-full" />
            <Skeleton className="h-4 w-3/4 max-w-sm rounded-full" />
          </div>
          <div className="grid content-start gap-3 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-4 w-52 rounded-full" />
          </div>
        </div>
      </section>
    </div>
  );
}
