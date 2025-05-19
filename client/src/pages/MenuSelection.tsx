import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import WeekSelector from "@/components/WeekSelector";
import MealCard from "@/components/MealCard";
import OrderSummary from "@/components/OrderSummary";
import ProgressIndicator from "@/components/ProgressIndicator";
import { Meal, PortionSize, OrderItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface MenuSelectionProps {
  weekId: string;
}

const MenuSelection = ({ weekId }: MenuSelectionProps) => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Parse URL search params
  const params = new URLSearchParams(window.location.search);
  const initialMealCount = parseInt(params.get("mealCount") || "6", 10);
  const initialPortionSize = params.get("portionSize") || "standard";

  const [mealCount, setMealCount] = useState(initialMealCount);
  const [portionSize, setPortionSize] = useState<string>(initialPortionSize);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);

  // Fetch menu data
  const { data: menuData, isLoading } = useQuery<{ meals: Meal[] }>({
    queryKey: [`/api/menu/${weekId}`],
  });

  // Fetch existing order for this week if any
  const { data: existingOrder } = useQuery<{ 
    mealCount: number, 
    defaultPortionSize: string,
    items: OrderItem[]
  }>({
    queryKey: [`/api/orders/${weekId}`],
  });

  // Update selections if existing order is found
  useEffect(() => {
    if (existingOrder) {
      setMealCount(existingOrder.mealCount);
      setPortionSize(existingOrder.defaultPortionSize);
      setSelectedMeals(existingOrder.items);
    }
  }, [existingOrder]);

  // Meal selection handlers
  const handleSelectMeal = (mealId: number, selectedPortionSize: PortionSize) => {
    if (selectedMeals.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You have already selected ${mealCount} meals. Remove a meal to add a different one.`,
        variant: "destructive"
      });
      return;
    }

    // Allow selecting the same meal multiple times
    setSelectedMeals([...selectedMeals, { mealId, portionSize: selectedPortionSize }]);
  };

  const handleRemoveMeal = (mealId: number) => {
    // Remove only the first occurrence of the meal
    const index = selectedMeals.findIndex(item => item.mealId === mealId);
    if (index !== -1) {
      const updatedMeals = [...selectedMeals];
      updatedMeals.splice(index, 1);
      setSelectedMeals(updatedMeals);
    }
  };

  const isMealSelected = (mealId: number) => {
    // Check if this specific meal is in the selected meals array
    return selectedMeals.some(item => item.mealId === mealId);
  };

  // Get count of how many times a meal is selected
  const getMealCount = (mealId: number) => {
    return selectedMeals.filter(item => item.mealId === mealId).length;
  };

  const isSelectionComplete = selectedMeals.length === mealCount;

  // Group meals by category
  const mealCategories = menuData?.meals.reduce((categories, meal) => {
    const category = meal.category || "Main Dishes";
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(meal);
    return categories;
  }, {} as Record<string, Meal[]>) || {};

  const categoryNames = Object.keys(mealCategories);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-6xl">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="h-12 bg-gray-200 rounded w-2/3 mx-auto mt-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="flex justify-between pt-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Define the checkout steps
  const steps = [
    { id: 1, label: "Choose Your Plan" },
    { id: 2, label: "Create Your Wagba Account" },
    { id: 3, label: "Complete Checkout" }
  ];
  
  return (
    <div className="bg-white py-8">
      <div className="container mx-auto px-4">
        <ProgressIndicator steps={steps} currentStep={1} />
        
        <div className="text-center mb-8 mt-6">
          <span className="inline-block bg-accent-secondary bg-opacity-20 text-accent-secondary px-3 py-1 rounded-full text-sm font-medium mb-4">Fresh Selection</span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 font-poppins">This Week's Menu</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select {mealCount} meals from our chef-prepared options
          </p>
        </div>
        
        {/* Week Selection */}
        <WeekSelector currentWeekId={weekId} />
        
        {/* Meal Selection Count */}
        <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between px-4">
          <h3 className="text-lg font-medium">
            Select your meals ({selectedMeals.length} of {mealCount} selected)
          </h3>
          <div className="flex items-center">
            <button 
              className="text-accent-foreground underline hover:text-primary focus:outline-none text-sm"
              onClick={() => setSelectedMeals([])}
            >
              Clear All Selections
            </button>
          </div>
        </div>
        
        {/* Meals by Category */}
        <Tabs defaultValue={categoryNames[0] || "Main Dishes"} className="max-w-6xl mx-auto mb-10">
          <TabsList className="mb-6">
            {categoryNames.map((category) => (
              <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
            ))}
          </TabsList>
          
          {categoryNames.map((category) => (
            <TabsContent key={category} value={category} className="animate-in fade-in-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mealCategories[category]?.map((meal) => (
                  <MealCard 
                    key={meal.id}
                    meal={meal}
                    isSelected={isMealSelected(meal.id)}
                    selectedCount={getMealCount(meal.id)}
                    onSelect={handleSelectMeal}
                    onRemove={handleRemoveMeal}
                    disabled={isSelectionComplete && !isMealSelected(meal.id)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        {/* Order Summary */}
        <div className="mt-10">
          <OrderSummary
            selectedMeals={selectedMeals}
            mealCount={mealCount}
            portionSize={portionSize}
            weekId={weekId}
          />
        </div>
      </div>
    </div>
  );
};

export default MenuSelection;
