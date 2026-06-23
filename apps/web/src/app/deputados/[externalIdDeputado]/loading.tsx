import { DeputadoPerfilSkeleton } from "@/shared/deputado";
import { Skeleton } from "@/shared/ui";

export default function Loading() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-256 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <Skeleton className="h-4 w-48 rounded-full" />
        <DeputadoPerfilSkeleton />
      </div>
    </main>
  );
}
