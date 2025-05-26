import { Skeleton } from "@/components/ui/skeleton";

export default function OrderHistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Table Header */}
      <div className="border rounded-lg">
        <div className="border-b p-4">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-18" />
          </div>
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b last:border-b-0 p-4">
            <div className="grid grid-cols-5 gap-4 items-center">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}