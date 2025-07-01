import { useState, useEffect } from "react";
import { Link } from "wouter";
import ProgressIndicator from "@/components/ProgressIndicator";
import { Button } from "@/components/ui/button";
import PlanSelector from "@/components/PlanSelector";
import PortionSelector from "@/components/PortionSelector";
import { useQuery } from "@tanstack/react-query";
import { Week } from "@shared/schema";
import { PricingService } from "@/lib/pricingService";

const MealPlans = () => {
  const [selectedMealCount, setSelectedMealCount] = useState(6);
  const [selectedPortionSize, setSelectedPortionSize] = useState("standard");
  const [pricing, setPricing] = useState<Record<number, { standard: number; large: number }>>({});
  const [largeMealAddOn, setLargeMealAddOn] = useState(99);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Get current week for menu redirect
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });

  const currentWeekId = weeksData?.weeks.find(week => week.isSelectable)?.id || "current";

  // Load dynamic pricing
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const [mealPricing, largeMealPrice] = await Promise.all([
          PricingService.getAllMealPricing(),
          PricingService.getLargeMealAddonPrice()
        ]);
        
        const dynamicPricing: Record<number, { standard: number; large: number }> = {};
        
        // Convert Map to object
        mealPricing.forEach((standardPrice, count) => {
          dynamicPricing[count] = {
            standard: standardPrice,
            large: standardPrice + largeMealPrice
          };
        });
        
        setPricing(dynamicPricing);
        setLargeMealAddOn(largeMealPrice);
        setPricingLoaded(true);
      } catch (error) {
        console.error('Failed to load dynamic pricing:', error);
        // Fallback to default pricing
        setPricing({
          4: { standard: 599, large: 698 },
          6: { standard: 749, large: 848 },
          8: { standard: 899, large: 998 },
          10: { standard: 1049, large: 1148 },
          12: { standard: 1199, large: 1298 },
          14: { standard: 1349, large: 1448 }
        });
        setPricingLoaded(true);
      }
    };
    
    loadPricing();
  }, []);

  // Calculate total based on selection
  const calculateTotal = () => {
    if (!pricing[selectedMealCount]) return 0;
    
    if (selectedPortionSize === "mixed") {
      // For mixed, show the base standard price range
      return pricing[selectedMealCount].standard * selectedMealCount;
    }

    return pricing[selectedMealCount][selectedPortionSize as keyof typeof pricing[4]] * selectedMealCount;
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
        {pricingLoaded ? (
          <PlanSelector
            selectedMealCount={selectedMealCount}
            onMealCountChange={setSelectedMealCount}
            pricing={pricing}
            selectedPortionSize={selectedPortionSize}
          />
        ) : (
          <div className="max-w-4xl mx-auto mb-8 text-center py-8">
            <div className="text-gray-500">Loading meal plans...</div>
          </div>
        )}

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
                {pricing[selectedMealCount] ? (
                  `EGP ${pricing[selectedMealCount][selectedPortionSize === "mixed" ? "standard" : selectedPortionSize as keyof typeof pricing[4]]} per meal`
                ) : (
                  "Loading..."
                )}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">Portion Size</span>
              <span className="font-medium capitalize">{selectedPortionSize}</span>
            </div>

            {selectedPortionSize === "large" && (
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Large Portion Premium</span>
                <span className="font-medium">+EGP {largeMealAddOn} per meal</span>
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