export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-3">
        <div className="bg-cream h-9 w-48 animate-pulse rounded" />
        <div className="bg-cream h-5 w-80 animate-pulse rounded" />
      </div>
      <div className="border-line bg-surface h-56 rounded-2xl border" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border-line bg-surface overflow-hidden rounded-2xl border">
            <div className="bg-cream aspect-[4/3] animate-pulse" />
            <div className="flex flex-col gap-3 p-5">
              <div className="bg-cream h-5 w-3/4 animate-pulse rounded" />
              <div className="bg-cream h-4 w-1/2 animate-pulse rounded" />
              <div className="bg-cream h-6 w-1/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
