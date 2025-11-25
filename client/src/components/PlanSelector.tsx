
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface PlanSelectorProps {
  selectedMealCount: number;
  onMealCountChange: (count: number) => void;
  pricing: Record<number, { standard: number; large: number }>;
  selectedPortionSize: string;
}

const PlanSelector = ({ selectedMealCount, onMealCountChange, pricing, selectedPortionSize }: PlanSelectorProps) => {
  const mealCounts = [4, 6, 8, 10, 12, 14];
  
  const getPrice = (count: number) => {
    // Always show standard price in the buttons
    if (!pricing || !pricing[count]) {
      // Fallback pricing if data is not loaded yet
      const fallbackPricing: Record<number, number> = {
        4: 599, 6: 749, 8: 899, 10: 1049, 12: 1199, 14: 1349
      };
      return fallbackPricing[count] || 0;
    }
    return pricing[count].standard;
  };
  
  return (
    <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
      <Card className="rounded-lg sm:rounded-xl shadow-md">
        <CardContent className="p-2 sm:p-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2 w-full">
            {mealCounts.map((count) => (
              <button
                key={count}
                className={`px-2 sm:px-4 py-2 rounded-lg font-medium text-center transition-colors duration-200 focus:outline-none relative text-xs sm:text-sm ${
                  selectedMealCount === count
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => onMealCountChange(count)}
              >
                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                  <span className="block sm:inline">{count}</span>
                  <span className="hidden sm:inline">Meals</span>
                  {count === 10 && (
                    <Heart 
                      className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 fill-current" 
                      aria-label="Recommended" 
                    />
                  )}
                </div>
                <div className="text-xs sm:text-sm mt-1">EGP {getPrice(count)}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanSelector;
