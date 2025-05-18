import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface PlanSelectorProps {
  selectedMealCount: number;
  onMealCountChange: (count: number) => void;
}

const PlanSelector = ({ selectedMealCount, onMealCountChange }: PlanSelectorProps) => {
  const mealCounts = [4, 6, 8, 10, 12, 14];
  
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
                {count} Meals
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanSelector;
