import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MinusCircle, PlusCircle } from "lucide-react";

interface FixedMealSelectorProps {
  weekId: number;
  orderId: number | null;
  mealCount: number;
  initialItems: any[];
}

// Simple meal selector component that works correctly with API data
export default function FixedMealSelector({
  weekId,
  orderId,
  mealCount = 3,
  initialItems = []
}: FixedMealSelectorProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState(initialItems);

  // Fetch all available meals
  const { data: meals, isLoading } = useQuery({
    queryKey: ['/api/meals'],
    queryFn: async () => {
      try {
        // Direct API call that just returns exactly what we get from the server
        const response = await fetch(`/api/meals`);
        const data = await response.json();
        console.log("Fetched meals data:", data);
        return data.meals || [];
      } catch (error) {
        console.error("Error fetching meals:", error);
        return [];
      }
    }
  });

  // Update selected items when initialItems changes
  useEffect(() => {
    setSelectedItems(initialItems);
  }, [initialItems]);

  // Get the count of a particular meal in selections
  const getMealCount = (mealId: number): number => {
    return selectedItems.filter(item => item.mealId === mealId).length;
  };

  // Add a meal to the order
  const handleAddMeal = async (meal: any) => {
    // Check if maximum meals already selected
    if (selectedItems.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`
      });
      return;
    }

    try {
      console.log("Adding meal:", meal.id, "to order:", orderId);
      
      // Optimistically update UI
      const updatedItems = [...selectedItems, {
        id: Date.now(), // Temporary ID for UI
        mealId: meal.id,
        portionSize: "standard",
        meal: meal
      }];
      setSelectedItems(updatedItems);

      if (orderId) {
        // Add to existing order
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
      } else {
        // Create new order
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weekId,
            mealCount,
            defaultPortionSize: "standard",
            items: [{
              mealId: meal.id,
              portionSize: "standard"
            }]
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create order');
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Meal added",
        description: `${meal.title} has been added to your selections.`
      });
    } catch (error) {
      console.error("Error adding meal:", error);
      // Revert the optimistic update
      setSelectedItems(selectedItems);
      
      toast({
        title: "Error",
        description: "Failed to add meal. Please try again."
      });
    }
  };

  // Remove a meal from the order
  const handleRemoveMeal = async (meal: any) => {
    // Find the item to remove
    const itemToRemove = selectedItems.find(item => item.mealId === meal.id);
    if (!itemToRemove || !orderId) return;

    try {
      console.log("Removing meal:", meal.id, "item:", itemToRemove.id, "from order:", orderId);
      
      // Optimistically update UI
      const updatedItems = selectedItems.filter(item => 
        !(item.mealId === meal.id && item.id === itemToRemove.id)
      );
      setSelectedItems(updatedItems);

      // Remove from order using direct fetch for more control
      const response = await fetch(`/api/orders/${orderId}/items/${itemToRemove.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove meal');
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Meal removed",
        description: `${meal.title} has been removed from your selections.`
      });
    } catch (error) {
      console.error("Error removing meal:", error);
      // Revert the optimistic update
      setSelectedItems(selectedItems);
      
      toast({
        title: "Error",
        description: "Failed to remove meal. Please try again."
      });
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Select Your Meals</h3>
        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
          {selectedItems.length || 0} of {mealCount} selected
        </span>
      </div>

      {meals && meals.length > 0 ? (
        <div className="space-y-4">
          {meals.map((meal: any) => {
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
    </div>
  );
}