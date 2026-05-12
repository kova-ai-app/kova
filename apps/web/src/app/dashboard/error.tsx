'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{error.message}</p>
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  )
}
