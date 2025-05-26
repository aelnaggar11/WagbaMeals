import { Skeleton } from "@/components/ui/skeleton";

export default function WeekSelectorSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="py-4 px-2 text-center rounded-md border border-gray-200 animate-pulse">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
        </div>
      ))}
    </div>
  );
}