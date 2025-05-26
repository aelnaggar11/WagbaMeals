import { Skeleton } from "@/components/ui/skeleton";

export default function MealCardSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden animate-pulse">
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
  );
}