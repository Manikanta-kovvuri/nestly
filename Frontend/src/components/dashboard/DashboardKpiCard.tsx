import type { ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';

interface DashboardKpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export function DashboardKpiCard({ title, value, icon }: DashboardKpiCardProps) {
  return (
    <Card className="rounded-xl border border-gray-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
