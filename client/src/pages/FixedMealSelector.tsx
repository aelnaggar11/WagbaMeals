import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MinusCircle, PlusCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Meal {
  id: number;
  title: string;
  imageUrl: string;
  calories: number;
  protein: number;
}

interface WeekItem {
  id: number;
  mealId: number;
  portionSize: string;
  meal: Meal;
}

interface FixedMealSelectorProps {
  weekId: number;
  orderId: number | null;
  mealCount: number;
  items: WeekItem[];
}

export default function FixedMealSelector({
  weekId,
  orderId,
  mealCount = 3,
  items = []
}: FixedMealSelectorProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<WeekItem[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch meals for this week
  const { data, isLoading } = useQuery({
    queryKey: [`/api/menu/${weekId}`],
    enabled: !!weekId,
  });

  // Initialize once with props
  useEffect(() => {
    if (!isInitialized && items.length > 0) {
      setSelectedItems(items);
      
      // Group the items by meal ID for display
      const grouped = groupMealsByCount(items);
      setSavedItems(grouped);
      
      // If we have items, consider the selection as saved
      setIsSaved(items.length > 0);
      setIsInitialized(true);
    }
  }, [items, isInitialized]);

  // Group meals by ID and count them
  const groupMealsByCount = (items: WeekItem[]) => {
    const groups: Record<number, { meal: Meal, count: number }> = {};
    
    items.forEach(item => {
      if (!groups[item.mealId]) {
        groups[item.mealId] = {
          meal: item.meal,
          count: 1
        };
      } else {
        groups[item.mealId].count++;
      }
    });
    
    return Object.values(groups);
  };

  // Get the count of a particular meal in selections
  const getMealCount = (mealId: number): number => {
    return selectedItems.filter(item => item.mealId === mealId).length;
  };

  // Add a meal to the selection
  const handleAddMeal = async (meal: Meal) => {
    if (selectedItems.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`
      });
      return;
    }

    try {
      // Create a new item
      const newItem: WeekItem = {
        id: Date.now(), // Temporary ID for UI
        mealId: meal.id,
        portionSize: "standard",
        meal: meal
      };
      
      // Update local state
      setSelectedItems(prev => [...prev, newItem]);

      // Save to server if we have an order
      if (orderId) {
        const response = await fetch(`/api/orders/${orderId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mealId: meal.id,
            portionSize: "standard"
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add meal');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add meal. Please try again."
      });
    }
  };

  // Remove a meal from the selection
  const handleRemoveMeal = async (meal: Meal) => {
    // Find the first occurrence of this meal in our selection
    const itemIndex = selectedItems.findIndex(item => item.mealId === meal.id);
    if (itemIndex === -1) return;
    
    const itemToRemove = selectedItems[itemIndex];

    try {
      // Update local state (remove just one instance)
      const newItems = [...selectedItems];
      newItems.splice(itemIndex, 1);
      setSelectedItems(newItems);

      // Delete from server if we have an order ID and item ID
      if (orderId && itemToRemove.id) {
        const response = await fetch(`/api/orders/${orderId}/items/${itemToRemove.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to remove meal');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove meal. Please try again."
      });
    }
  };
  
  // Save the current meal selection
  const handleSave = () => {
    if (selectedItems.length !== mealCount) {
      toast({
        title: "Wrong number of meals",
        description: `Please select exactly ${mealCount} meals before saving.`,
        variant: "destructive"
      });
      return;
    }
    
    // Group the meals for display
    const grouped = groupMealsByCount(selectedItems);
    setSavedItems(grouped);
    setIsSaved(true);
    
    // Update the upcoming meals data
    queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
    
    toast({
      title: "Selection saved",
      description: "Your meal selection has been saved.",
    });
  };
  
  // Switch back to edit mode
  const handleEdit = () => {
    setIsSaved(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const meals = data?.meals || [];

  return (
    <div>
      {isSaved ? (
        // Saved view with grouped meals
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Your Selected Meals</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Selection
            </Button>
          </div>
          
          {savedItems.length > 0 ? (
            <div className="space-y-4">
              {savedItems.map((item: any, index: number) => (
                <div key={index} className="flex items-center p-4 border rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-4">
                    {item.meal.imageUrl && (
                      <img 
                        src={item.meal.imageUrl} 
                        alt={item.meal.title} 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-lg">{item.meal.title}</h4>
                      {item.count > 1 && (
                        <Badge variant="secondary" className="ml-2">
                          x{item.count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center mt-1 text-sm text-gray-600">
                      <span>{item.meal.calories || 0} cal</span>
                      <span className="mx-2">•</span>
                      <span>{item.meal.protein || 0}g protein</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No meals selected.</p>
            </div>
          )}
        </>
      ) : (
        // Edit mode with meal selector
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Select Your Meals</h3>
            <div className="flex items-center gap-3">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                {selectedItems.length} of {mealCount} selected
              </span>
              <Button 
                onClick={handleSave}
                disabled={selectedItems.length !== mealCount}
                className="flex items-center gap-2"
                size="sm"
              >
                <Save size={16} />
                Save Selection
              </Button>
            </div>
          </div>

          {meals.length > 0 ? (
            <div className="space-y-4">
              {meals.map((meal: Meal) => {
                const count = getMealCount(meal.id);
                const isSelected = count > 0;
                const isMaxReached = selectedItems.length >= mealCount;
                
                return (
                  <div key={meal.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center p-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden mr-4">
                        {meal.imageUrl && (
                          <img 
                            src={meal.imageUrl} 
                            alt={meal.title} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{meal.title}</h4>
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <span>{meal.calories || 0} cal</span>
                          <span className="mx-2">•</span>
                          <span>{meal.protein || 0}g protein</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isSelected}
                          onClick={() => handleRemoveMeal(meal)}
                          className={isSelected ? 'text-red-500 hover:bg-red-50 hover:text-red-700' : 'text-gray-300'}
                        >
                          <MinusCircle size={24} />
                        </Button>
                        
                        <span className="w-8 text-center font-medium">
                          {count}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isMaxReached && !isSelected}
                          onClick={() => handleAddMeal(meal)}
                          className={(!isMaxReached || isSelected) ? 'text-green-500 hover:bg-green-50 hover:text-green-700' : 'text-gray-300'}
                        >
                          <PlusCircle size={24} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No meals available.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
