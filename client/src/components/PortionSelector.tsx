import { Card, CardContent } from "@/components/ui/card";

interface PortionSelectorProps {
  selectedPortionSize: string;
  onPortionSizeChange: (size: string) => void;
}

const PortionSelector = ({ 
  selectedPortionSize, 
  onPortionSizeChange 
}: PortionSelectorProps) => {
  return (
    <div className="max-w-3xl mx-auto mb-12">
      <h3 className="text-xl font-bold mb-4 text-center">Choose Your Portion Size</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            selectedPortionSize === "standard"
              ? "border-2 border-accent-foreground"
              : "border-2 border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onPortionSizeChange("standard")}
        >
          <CardContent className="p-0">
            <h4 className="text-lg font-bold mb-2">Standard</h4>
            <p className="text-gray-500 text-sm mb-3">Regular portion with balanced nutritional value</p>
            <div className="text-xl font-bold text-primary mb-2">EGP 249 <span className="text-sm text-gray-500">/ meal</span></div>
            <div className="text-sm text-gray-600">~500-600 calories per meal</div>
          </CardContent>
        </Card>
        
        <Card 
          className={`rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            selectedPortionSize === "large"
              ? "border-2 border-accent-foreground"
              : "border-2 border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onPortionSizeChange("large")}
        >
          <CardContent className="p-0">
            <h4 className="text-lg font-bold mb-2">Large</h4>
            <p className="text-gray-500 text-sm mb-3">Extra protein and larger serving size</p>
            <div className="text-xl font-bold text-primary mb-2">EGP 348 <span className="text-sm text-gray-500">/ meal</span></div>
            <div className="text-sm text-gray-600">~700-800 calories per meal</div>
          </CardContent>
        </Card>
        
        <Card 
          className={`rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            selectedPortionSize === "mixed"
              ? "border-2 border-accent-foreground"
              : "border-2 border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onPortionSizeChange("mixed")}
        >
          <CardContent className="p-0">
            <h4 className="text-lg font-bold mb-2">Mix & Match</h4>
            <p className="text-gray-500 text-sm mb-3">Select portion size per meal</p>
            <div className="text-xl font-bold text-primary mb-2">Varies <span className="text-sm text-gray-500">/ meal</span></div>
            <div className="text-sm text-gray-600">Customize each meal</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortionSelector;
