
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PricingService } from "@/lib/pricingService";

interface PortionSelectorProps {
  selectedPortionSize: string;
  onPortionSizeChange: (size: string) => void;
}

const PortionSelector = ({ selectedPortionSize, onPortionSizeChange }: PortionSelectorProps) => {
  const [largeMealAddOn, setLargeMealAddOn] = useState(99);

  // Load dynamic pricing
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const largeMealPrice = await PricingService.getLargeMealAddonPrice();
        setLargeMealAddOn(largeMealPrice);
      } catch (error) {
        console.error('Failed to load large meal pricing:', error);
      }
    };
    
    loadPricing();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
      <Card className="rounded-lg sm:rounded-xl shadow-md">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Choose Your Portion Size</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <button
              className={`p-3 sm:p-4 rounded-lg text-left transition-colors duration-200 ${
                selectedPortionSize === "standard"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onPortionSizeChange("standard")}
            >
              <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base">Standard</h4>
              
              <p className="text-xs sm:text-sm text-gray-600">500-600 Calories</p>
              <p className="text-xs sm:text-sm text-gray-600">30-40g Protein</p>
            </button>

            <button
              className={`p-3 sm:p-4 rounded-lg text-left transition-colors duration-200 ${
                selectedPortionSize === "large"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onPortionSizeChange("large")}
            >
              <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base">Large</h4>
              <p className="text-xs sm:text-sm text-primary font-medium mb-1">+EGP {largeMealAddOn}</p>
              <p className="text-xs sm:text-sm text-gray-600">750-850 Calories</p>
              <p className="text-xs sm:text-sm text-gray-600">45-60g Protein</p>
            </button>

            <button
              className={`p-3 sm:p-4 rounded-lg text-left transition-colors duration-200 ${
                selectedPortionSize === "mixed"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onPortionSizeChange("mixed")}
            >
              <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base">Mix & Match</h4>
              <p className="text-xs sm:text-sm text-gray-600">Select portion per meal</p>
             
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortionSelector;
