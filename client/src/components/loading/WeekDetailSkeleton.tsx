import { Skeleton } from "@/components/ui/skeleton";

export default function WeekDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Week Card Skeleton */}
      <div className="border rounded-lg">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          
          {/* Status and Buttons */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Meal Selection Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      
      {/* Meal Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            <div className="flex items-center p-4">
              <Skeleton className="w-20 h-20 rounded-md mr-4" />
              
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}