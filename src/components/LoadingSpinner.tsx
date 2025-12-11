import { CircleNotch } from "phosphor-react";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className = "" }: LoadingSpinnerProps) {
  return (
    <CircleNotch
      size={size}
      weight="bold"
      className={`animate-spin ${className}`}
    />
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
        <LoadingSpinner size={32} className="text-blue-600" />
        {message && <p className="text-slate-700 text-sm">{message}</p>}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded animate-pulse"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        ></div>
      ))}
    </div>
  );
}

