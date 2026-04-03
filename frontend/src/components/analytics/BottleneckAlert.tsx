import { AlertTriangle } from "lucide-react";

interface BottleneckAlertProps {
  message?: string;
}

export function BottleneckAlert({ message }: BottleneckAlertProps) {
  if (!message) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-700">{message}</p>
    </div>
  );
}
