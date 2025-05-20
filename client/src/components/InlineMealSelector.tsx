import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Meal, OrderItem, PortionSize } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle } from "lucide-react";

interface InlineMealSelectorProps {
  weekId: number;
  orderId: number | null;
  mealCount: number;
  selectedItems: Array<{
    id: number;
    mealId: number;
    portionSize: string;
  }>;
}

export default function InlineMealSelector({
  weekId,
  orderId,
  mealCount,
  selectedItems
}: InlineMealSelectorProps) {
  const { toast } = useToast();

  // Fetch all meals
  const { data: mealsData, isLoading } = useQuery({
    queryKey: ['/api/meals'],
    select: (data: any) => data?.meals || []
  });

  // Create a lookup of selected meal IDs
  const selectedMeals = selectedItems?.map(item => item.mealId) || [];
  
  const getSelectedCount = (mealId: number) => {
    return selectedItems?.filter(item => item.mealId === mealId).length || 0;
  };

  const handleAddMeal = async (meal: Meal) => {
    if (selectedItems.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`
      });
      return;
    }

    const newMeal: OrderItem = {
      mealId: meal.id,
      portionSize: "standard" as PortionSize
    };

    try {
      if (orderId) {
        // Add to existing order
        await apiRequest('POST', `/api/orders/${orderId}/items`, newMeal);
      } else {
        // Create new order
        await apiRequest('POST', '/api/orders', {
          weekId,
          mealCount,
          defaultPortionSize: "standard",
          items: [newMeal]
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Meal added",
        description: `${meal.title} has been added to your selections.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add meal. Please try again."
      });
    }
  };

  const handleRemoveMeal = async (meal: Meal) => {
    // Find the item in selectedItems
    const itemToRemove = selectedItems.find(item => item.mealId === meal.id);
    if (!itemToRemove || !orderId) return;

    try {
      // Remove from order
      await apiRequest('DELETE', `/api/orders/${orderId}/items/${itemToRemove.id}`);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Meal removed",
        description: `${meal.title} has been removed from your selections.`
      });
    } catch (error) {
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

  if (!mealsData || mealsData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No meals available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Select Your Meals</h3>
        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
          {selectedItems.length} of {mealCount} selected
        </span>
      </div>

      {mealsData.map((meal: Meal) => {
        const count = getSelectedCount(meal.id);
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
  );
}