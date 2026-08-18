import { Building2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { Property } from '../../lib/propertyApi';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Card className="overflow-hidden rounded-xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
      {/* Image Placeholder */}
      <div className="flex h-48 w-full items-center justify-center bg-blue-50 text-primary">
        <Building2 className="h-12 w-12 opacity-50" />
      </div>
      <CardContent className="p-5">
        <h3 className="truncate text-lg font-semibold text-gray-900">{property.name}</h3>
        <p className="mt-1 truncate text-sm text-gray-500">{property.address}</p>
      </CardContent>
    </Card>
  );
}
