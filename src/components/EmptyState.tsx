import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  suggestions?: string[];
  onSelectSuggestion?: (item: string) => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  suggestions,
  onSelectSuggestion,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center shadow-xs">
      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500 shadow-inner">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>

      {suggestions && suggestions.length > 0 && onSelectSuggestion && (
        <div className="mt-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Try quick destination</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={() => onSelectSuggestion(item)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-rose-300 hover:text-rose-600 active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-slate-800 active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
