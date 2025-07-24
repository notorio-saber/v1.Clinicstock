import { Package } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-primary/20 p-2 text-primary">
        <Package className="h-6 w-6" />
      </div>
      <h1 className="gradient-text text-2xl font-bold">
        ClinicStock
      </h1>
    </div>
  );
}
