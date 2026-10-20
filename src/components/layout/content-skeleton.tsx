// Placeholder shown while session-dependent content streams in.
export function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-6 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
