
import { Card, CardContent } from "@/components/ui/card";

interface PlanSelectorProps {
  selectedMealCount: number;
  onMealCountChange: (count: number) => void;
  pricing: Record<number, { standard: number; large: number }>;
  selectedPortionSize: string;
}

const PlanSelector = ({ selectedMealCount, onMealCountChange, pricing, selectedPortionSize }: PlanSelectorProps) => {
  const mealCounts = [4, 6, 8, 10, 12, 14];
  
  const getPrice = (count: number) => {
    if (selectedPortionSize === "mixed") {
      return ((pricing[count].standard + pricing[count].large) / 2).toFixed(0);
    }
    return pricing[count][selectedPortionSize as keyof typeof pricing[4]];
  };
  
  return (
    <div className="max-w-4xl mx-auto mb-8">
      <Card className="rounded-xl shadow-md">
        <CardContent className="p-2">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
            {mealCounts.map((count) => (
              <button
                key={count}
                className={`px-4 py-2 rounded-lg font-medium text-center transition-colors duration-200 focus:outline-none ${
                  selectedMealCount === count
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => onMealCountChange(count)}
              >
                <div>{count} Meals</div>
                <div className="text-sm mt-1">EGP {getPrice(count)}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanSelector;
