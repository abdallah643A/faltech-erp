import { BarChart2 } from 'lucide-react';

interface EmptyChartStateProps {
  message?: string;
  height?: number;
}

export function EmptyChartState({ message = 'No data available', height = 200 }: EmptyChartStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
      <BarChart2 className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
