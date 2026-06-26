import { Skeleton, SkeletonRows } from "@/shared/ui";

export default function Loading() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <Skeleton className="h-4 w-48 rounded-full" />
        <div className="grid gap-3">
          <Skeleton className="h-8 w-[70%] rounded-md" />
          <Skeleton className="h-4 w-[90%] rounded-full" />
          <Skeleton className="h-4 w-[60%] rounded-full" />
        </div>
        <SkeletonRows count={5} />
      </div>
    </main>
  );
}
