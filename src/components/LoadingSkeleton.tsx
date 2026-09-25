interface LoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'list' | 'stat';
}

export function LoadingSkeleton({ count = 3, type = 'card' }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'stat') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-16 rounded-sm bg-slate-200" />
            <div className="mt-2 h-6 w-24 rounded-sm bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded-sm bg-slate-200" />
              <div className="h-4 w-20 rounded-sm bg-slate-200" />
            </div>
            <div className="mt-2 h-3 w-48 rounded-sm bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded-sm bg-slate-200" />
              <div className="h-3 w-64 rounded-sm bg-slate-100" />
              <div className="h-3 w-28 rounded-sm bg-slate-100" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
