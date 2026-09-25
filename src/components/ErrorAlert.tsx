import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  source?: string;
  onRetry?: () => void;
}

export function ErrorAlert({ error, source, onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
          <AlertTriangle className="h-5 w-5 shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-rose-950">Upstream Service Error</h4>
            {source && (
              <span className="inline-flex items-center rounded-md bg-rose-200/80 px-2 py-0.5 text-xs font-mono font-medium text-rose-800">
                Source: {source}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-rose-700 leading-relaxed break-words">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
