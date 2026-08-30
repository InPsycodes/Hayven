export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <div className="h-3 w-32 rounded bg-charcoal/10" />
      <div className="mt-3 h-8 w-80 max-w-full rounded bg-charcoal/10" />
      <div className="mt-3 h-3.5 w-64 max-w-full rounded bg-charcoal/10" />

      <div className="mt-6 h-9 w-full max-w-md rounded-full bg-charcoal/10" />
      <div className="mt-3 flex flex-wrap gap-2">
        {[64, 72, 60, 84].map((w) => (
          <div key={w} className="h-7 rounded-full bg-charcoal/10" style={{ width: w }} />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[108px] animate-pulse rounded-2xl bg-charcoal/[0.07] ring-1 ring-charcoal/10"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
