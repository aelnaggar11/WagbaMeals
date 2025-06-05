import { useState } from "react";
import { Link } from "wouter";
import ProgressIndicator from "@/components/ProgressIndicator";
import { Button } from "@/components/ui/button";
import PlanSelector from "@/components/PlanSelector";
import PortionSelector from "@/components/PortionSelector";
import { useQuery } from "@tanstack/react-query";
import { Week } from "@shared/schema";

const MealPlans = () => {
  const [selectedMealCount, setSelectedMealCount] = useState(6);
  const [selectedPortionSize, setSelectedPortionSize] = useState("standard");

  // Get current week for menu redirect
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });

  const currentWeekId = weeksData?.weeks.find(week => week.isSelectable)?.id || "current";

  // Pricing data based on meal counts
  const pricing = {
    4: { standard: 249, large: 348 },
    5: { standard: 239, large: 338 },
    6: { standard: 239, large: 338 },
    7: { standard: 219, large: 318 },
    8: { standard: 219, large: 318 },
    9: { standard: 219, large: 318 },
    10: { standard: 199, large: 298 },
    12: { standard: 199, large: 298 },
    14: { standard: 199, large: 298 }
  };

  // Calculate total based on selection
  const calculateTotal = () => {
    if (selectedPortionSize === "mixed") {
      // For mixed, show the base standard price range
      return pricing[selectedMealCount as keyof typeof pricing].standard * selectedMealCount;
    }

    return pricing[selectedMealCount as keyof typeof pricing][selectedPortionSize as keyof typeof pricing[4]] * selectedMealCount;
  };

  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <ProgressIndicator steps={[
          { id: 1, label: "Choose Your Plan" },
          { id: 2, label: "Your Selections" },
          { id: 3, label: "Create Account" },
          { id: 4, label: "Complete Checkout" }
        ]} currentStep={1} />
        
        <div className="text-center mb-12 mt-6"></div>

        {/* Meal Count Selection */}
        <PlanSelector
          selectedMealCount={selectedMealCount}
          onMealCountChange={setSelectedMealCount}
          pricing={pricing}
          selectedPortionSize={selectedPortionSize}
        />

        {/* Portion Size Selection */}
        <PortionSelector
          selectedPortionSize={selectedPortionSize}
          onPortionSizeChange={setSelectedPortionSize}
        />

        {/* Summary & Pricing */}
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-6 mb-10">
          <h3 className="text-xl font-bold mb-4">Your Plan Summary</h3>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">{selectedMealCount} meals per week</span>
              <span className="font-medium">
                EGP {pricing[selectedMealCount as keyof typeof pricing][selectedPortionSize === "mixed" ? "standard" : selectedPortionSize as keyof typeof pricing[4]]} per meal
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">Portion Size</span>
              <span className="font-medium capitalize">{selectedPortionSize}</span>
            </div>

            {selectedPortionSize === "large" && (
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Large Portion Premium</span>
                <span className="font-medium">+EGP 99 per meal</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 text-lg">
              <span className="font-bold">Weekly Total</span>
              {selectedPortionSize === "mixed" ? (
                <div className="text-right">
                  <span className="font-bold text-primary">From EGP {calculateTotal().toFixed(0)}</span>
                  <p className="text-xs text-gray-500 mt-1">Final total based on your meal selections</p>
                </div>
              ) : (
                <span className="font-bold text-primary">EGP {calculateTotal().toFixed(0)}</span>
              )}
            </div>
          </div>

          <Link href={`/menu/${currentWeekId}?mealCount=${selectedMealCount}&portionSize=${selectedPortionSize}`}>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white">
              Select Your Meals
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MealPlans;