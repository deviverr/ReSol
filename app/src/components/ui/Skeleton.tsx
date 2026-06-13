export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function ListingCardSkeleton() {
  return (
    <div className="glass rounded-[var(--radius-card)] p-3">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-3 h-6 w-1/3" />
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="aspect-[4/3] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="mt-5 h-7 w-2/3" />
      <Skeleton className="mt-3 h-5 w-1/3" />
      <Skeleton className="mt-5 h-20 w-full" />
      <Skeleton className="mt-5 h-12 w-full rounded-full" />
    </div>
  );
}
