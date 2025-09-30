import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Info } from "lucide-react";
import { Meal, PortionSize } from "@shared/schema";

interface MealCardProps {
  meal: Meal;
  isSelected: boolean;
  selectedCount: number;
  onSelect: (mealId: number, portionSize: PortionSize) => void;
  onRemove: (mealId: number) => void;
  disabled?: boolean;
  subscriptionType?: string; // Add subscription type to control UI
}

const MealCard = ({
  meal,
  isSelected,
  selectedCount,
  onSelect,
  onRemove,
  disabled = false,
  subscriptionType = "standard"
}: MealCardProps) => {
  const [portionSize, setPortionSize] = useState<PortionSize>("standard");
  
  const handlePortionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value as PortionSize;
    setPortionSize(newSize);
    
    if (isSelected) {
      onRemove(meal.id);
      onSelect(meal.id, newSize);
    }
  };
  
  // Note: Individual meal pricing removed - using subscription-based pricing

  return (
    <Card className={`rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 relative ${disabled && !isSelected ? 'opacity-60' : ''}`}>
      <img 
        src={meal.imageUrl} 
        alt={meal.title} 
        className="w-full h-48 object-cover"
      />
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold font-poppins">{meal.title}</h3>
          <div className="flex items-center space-x-2">
            <button 
              className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500"
              onClick={() => onRemove(meal.id)}
              disabled={!isSelected || disabled}
            >
              <Minus size={14} />
            </button>
            <span className="font-medium w-4 text-center">
              {selectedCount}
            </span>
            <button 
              className="w-6 h-6 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-white"
              onClick={() => onSelect(meal.id, portionSize)}
              disabled={disabled && !isSelected}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4">{meal.description}</p>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="text-xs text-gray-500 flex items-center flex-wrap">
              <svg className="mr-1 text-accent-secondary w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05c-.1.12-.187.248-.264.378-.08.13-.147.34-.2.51a5.03 5.03 0 00-.15 1.255c0 1.145.305 2.074.562 2.876.258.8.6 1.597.618 2.4.018.797-.53 1.917-1.412 3.233a1 1 0 001.645 1.137C7.563 15.421 8.5 13.5 8.55 12.45c.048-1.043-.305-1.95-.708-2.895-.402-.945-.797-1.848-.695-2.482.102-.635.5-1.28 1.13-1.848A1 1 0 0010 4c1.023 0 1.782.278 2.395.552.614.276 1.04.553 1.28.704.241.151.37.174.587.174.217 0 .524-.092.805-.242.282-.15.526-.363.732-.545a1 1 0 10-1.288-1.53c-.004.004-.262.235-.775.397-.513.162-1.156.262-1.834.262-.247 0-.478-.027-.658-.067.005-.123.008-.345.008-.67a1 1 0 00-1.687-.724c-.403.354-.89.724-1.384 1.094a1 1 0 00-.072 1.461 1.07 1.07 0 00.072.07c.46-.398.896-.82 1.285-1.253.224.365.53.705.89.997-.01.122-.025.244-.041.365-.135-.01-.288-.015-.45-.015-1.2 0-2.295.31-3.16.87C5.717 3.67 5.53 4.106 5.4 4.6c-.085.33-.139.674-.16 1.025-.035.59.03 1.177.2 1.73.14.45.334.853.582 1.197.239.33.51.6.814.806.234.15.505.254.796.304.29.049.596.05.896.003.433-.08.84-.274 1.17-.584.247-.232.435-.504.577-.812.147-.313.25-.658.312-1.02.063-.36.094-.73.096-1.095.002-.366-.027-.723-.085-1.07a8.032 8.032 0 01-.248-1.264 5.64 5.64 0 01-.033-.937c.015-.33.064-.76.15-1.264.087-.503.22-1.066.41-1.596.4-1.307 1.07-2.45 1.862-3.126a1 1 0 00.22-1.403z" clipRule="evenodd"></path>
              </svg>
              <span className="whitespace-nowrap">
                <strong>Std:</strong> {meal.calories} cal
              </span>
              {(subscriptionType === 'mixed' || subscriptionType === 'mix') && (
                <span className="ml-1 whitespace-nowrap text-[10px] sm:text-xs">
                  <strong>Large:</strong> {meal.caloriesLarge || Math.round(meal.calories * 1.5)} cal
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center flex-wrap">
              <svg className="mr-1 text-accent w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12.877 8.054c-.182.31-.345.6-.566.894A7.976 7.976 0 0010 10c-1.335 0-2.59-.323-3.697-.885a.923.923 0 00-.183-.11c-.792-.422-1.717-.692-2.715-.692-.75 0-1.376.164-1.848.442-.232.138-.428.312-.642.528a9.957 9.957 0 00-1.084 1.347 1 1 0 01-1.662-1.116 11.958 11.958 0 011.445-1.8c.32-.33.671-.625 1.104-.884.433-.26.933-.463 1.509-.542.576-.08 1.213-.041 1.895.12.408.1.819.232 1.22.407.201.088.397.183.585.284a9.97 9.97 0 012.958.523c.05-.613.28-1.18.665-1.657a3.78 3.78 0 01.9-.831c.342-.23.711-.393 1.103-.463.802-.143 1.653.082 2.494.725a1 1 0 11-1.262 1.551c-.382-.29-.798-.433-1.156-.374-.356.058-.6.165-.785.29a1.786 1.786 0 00-.432.394c-.219.283-.356.635-.356 1.022 0 .561.119 1.087.34 1.54.22.45.538.83.935 1.11a4.07 4.07 0 001.264.595c.218.055.444.095.673.126a10.928 10.928 0 00-.364-1.068 12.263 12.263 0 00-.348-.81 1 1 0 111.861-.73c.167.411.312.85.429 1.305.116.455.205.923.264 1.402a1 1 0 01-.702 1.097 6.156 6.156 0 01-1.38.268 6.563 6.563 0 01-1.216-.016 6.053 6.053 0 01-1.194-.24 6.05 6.05 0 01-1.8-.9 6.028 6.028 0 01-1.548-1.472 5.955 5.955 0 01-.695-1.232c-.287.328-.661.725-1.118 1.115-.459.39-1 .763-1.594 1.06a6.293 6.293 0 01-1.946.581c-.661.083-1.361.064-2.029-.117a6.01 6.01 0 01-1.834-.876 5.957 5.957 0 01-1.423-1.519 5.935 5.935 0 01-.775-1.757 1 1 0 011.931-.514 3.942 3.942 0 00.514 1.167c.21.33.477.624.788.842.31.218.673.38 1.054.446.38.066.798.04 1.202-.01.404-.05.826-.164 1.246-.33.42-.166.834-.384 1.225-.705.39-.322.736-.677 1.04-1.02.304-.343.565-.673.786-.962.115-.144.217-.275.302-.385a1.023 1.023 0 01.147-.142 3.943 3.943 0 00-.256-.839 3.95 3.95 0 00-.581-1.01 3.963 3.963 0 00-.877-.838 3.978 3.978 0 00-1.125-.509 1 1 0 11.502-1.936 5.978 5.978 0 011.687.764 5.967 5.967 0 011.316 1.257c.176.214.336.44.48.674z" clipRule="evenodd"></path>
              </svg>
              <span className="whitespace-nowrap">
                <strong>Std:</strong> {meal.protein}g
              </span>
              {(subscriptionType === 'mixed' || subscriptionType === 'mix') && (
                <span className="ml-1 whitespace-nowrap text-[10px] sm:text-xs">
                  <strong>Large:</strong> {meal.proteinLarge || Math.round(meal.protein * 1.5)}g
                </span>
              )}
            </div>
          </div>
          
          {meal.tags?.includes("vegetarian") && (
            <div className="bg-accent bg-opacity-20 text-accent-foreground text-xs px-2 py-1 rounded-full self-start sm:self-center">
              Vegetarian
            </div>
          )}
        </div>
        
        <div className="mt-2 pt-4 border-t border-gray-100 flex justify-between items-center">
          <div>
            <span className="text-sm font-bold text-gray-700">{portionSize === "standard" ? "Standard" : "Large"}</span>
            {/* Remove individual meal pricing per user request */}
          </div>
          <div className="flex items-center">
            <button className="bg-secondary hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center">
              <Info size={16} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-2"></div>
            <select 
              className={`bg-white border border-gray-200 rounded-lg text-sm py-1 pl-2 pr-6 ${
                subscriptionType !== 'mixed' && subscriptionType !== 'mix' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              value={portionSize}
              onChange={handlePortionChange}
              disabled={subscriptionType !== 'mixed' && subscriptionType !== 'mix'}
            >
              <option value="standard">Standard</option>
              <option value="large">Large (+EGP 99)</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealCard;
