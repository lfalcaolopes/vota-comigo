import { Skeleton, SkeletonRows } from "@/shared/ui";

export default function Loading() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border grid w-full min-w-0 max-w-5xl gap-8 px-4 pt-8 pb-16 md:pt-12">
        <div className="grid gap-3">
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-full" />
        </div>
        <SkeletonRows count={8} />
      </div>
    </main>
  );
}
