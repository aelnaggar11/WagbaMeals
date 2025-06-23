import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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

interface AccountPageMealSelectorProps {
  weekId: number;
  orderId: number | null;
  mealCount: number;
  items: WeekItem[];
}

export default function AccountPageMealSelector({
  weekId,
  orderId,
  mealCount,
  items = []
}: AccountPageMealSelectorProps) {
  const { toast } = useToast();

  // Use React Query to fetch meals for this specific week
  const { data: menuData, isLoading } = useQuery({
    queryKey: [`/api/menu/${weekId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/menu/${weekId}`);
      return response?.meals || [];
    }
  });

  // Get count of a particular meal in selections
  const getMealCount = (mealId: number): number => {
    return items.filter(item => item.mealId === mealId).length;
  };

  const handleAddMeal = async (meal: Meal) => {
    if (items.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`
      });
      return;
    }

    try {
      if (orderId) {
        // Add to existing order
        await apiRequest('POST', `/api/orders/${orderId}/items`, {
          mealId: meal.id,
          portionSize: "standard"
        });
      } else {
        // Create new order
        await apiRequest('POST', '/api/orders', {
          weekId,
          mealCount,
          defaultPortionSize: "standard",
          items: [{
            mealId: meal.id,
            portionSize: "standard"
          }]
        });
      }

      // Force immediate refresh of upcoming meals data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Meal added",
        description: `${meal.title} has been added to your selections.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveMeal = async (meal: Meal) => {
    const mealItem = items.find(item => item.mealId === meal.id);
    if (!mealItem || !orderId) return;

    try {
      await apiRequest('DELETE', `/api/orders/${orderId}/items/${mealItem.id}`);

      // Force immediate refresh of upcoming meals data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Meal removed",
        description: `${meal.title} has been removed from your selections.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Save selection handler
  const handleSaveSelection = async () => {
    if (!orderId || selectedCount === 0) return;

    try {
      await apiRequest('POST', `/api/orders/${orderId}/save-selection`);

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Selection saved",
        description: "Your meal selection has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save selection. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Debug information
  console.log("Meal selector received items:", items);
  console.log("Meal selector received mealCount:", mealCount);
  
  // Properly calculate the number of selected meals (make sure items is defined)
  const selectedCount = items?.length || 0;
  const maxMeals = mealCount || 3; // Default to 3 if not specified
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Select Your Meals</h3>
        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
          {selectedCount} of {maxMeals} selected
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {menuData && menuData.length > 0 ? (
            <div className="space-y-4">
              {menuData.map((meal: any) => {
                const count = getMealCount(meal.id);
                const isSelected = count > 0;
                const isMaxReached = items.length >= mealCount;

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
              <p className="text-gray-500">No meals available for this week.</p>
            </div>
          )}
          {/* Save Selection Button */}
          {selectedCount > 0 && (
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleSaveSelection}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                disabled={selectedCount === 0}
              >
                Save Selection ({selectedCount} meal{selectedCount !== 1 ? 's' : ''})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}