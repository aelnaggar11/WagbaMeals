
import { Card, CardContent } from "@/components/ui/card";

interface PortionSelectorProps {
  selectedPortionSize: string;
  onPortionSizeChange: (size: string) => void;
}

const PortionSelector = ({ selectedPortionSize, onPortionSizeChange }: PortionSelectorProps) => {
  return (
    <div className="max-w-4xl mx-auto mb-8">
      <Card className="rounded-xl shadow-md">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">Choose Your Portion Size</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className={`p-4 rounded-lg text-left transition-colors duration-200 ${
                selectedPortionSize === "standard"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onPortionSizeChange("standard")}
            >
              <h4 className="font-bold mb-2">Standard</h4>
              
              <p className="text-sm text-gray-600">500-600 Calories</p>
              <p className="text-sm text-gray-600">30-40g Protein</p>
            </button>

            <button
              className={`p-4 rounded-lg text-left transition-colors duration-200 ${
                selectedPortionSize === "large"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onPortionSizeChange("large")}
            >
              <h4 className="font-bold mb-2">Large</h4>
              <p className="text-sm text-primary font-medium mb-1">+EGP 99 per meal</p>
              <p className="text-sm text-gray-600">750-850 Calories</p>
              <p className="text-sm text-gray-600">45-60g Protein</p>
            </button>

            <button
              className={`p-4 rounded-lg text-left transition-colors duration-200 ${
                selectedPortionSize === "mixed"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onPortionSizeChange("mixed")}
            >
              <h4 className="font-bold mb-2">Mix & Match</h4>
              <p className="text-sm text-gray-600 mb-2">Select portion size per meal</p>
             
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortionSelector;
