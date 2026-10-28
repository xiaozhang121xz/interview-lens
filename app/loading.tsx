export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center p-6" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        正在加载…
      </div>
    </main>
  );
}
