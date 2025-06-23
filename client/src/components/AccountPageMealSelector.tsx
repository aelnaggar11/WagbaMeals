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
  const [isSaved, setIsSaved] = useState(false);
  const [localSelectedCount, setLocalSelectedCount] = useState(0);

  // Update local count when items change
  useEffect(() => {
    const newCount = items.reduce((total, item) => total + 1, 0);
    setLocalSelectedCount(newCount);
  }, [items]);

  // Check if this order is already saved (has "selected" status)
  const { data: orderData } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: async () => {
      if (!orderId) return null;
      return await apiRequest('GET', `/api/orders/${orderId}`);
    },
    enabled: !!orderId
  });

  // Update saved state based on order status
  useEffect(() => {
    if (orderData?.status === 'selected') {
      setIsSaved(true);
    } else {
      setIsSaved(false);
    }
  }, [orderData?.status]);

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
    if (localSelectedCount >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`,
        variant: "destructive"
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
        
        // Update local count immediately for responsive UI
        setLocalSelectedCount(prev => prev + 1);
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
      // Revert local count on error
      setLocalSelectedCount(prev => Math.max(0, prev - 1));
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
      
      // Update local count immediately for responsive UI
      setLocalSelectedCount(prev => Math.max(0, prev - 1));

      // Force immediate refresh of upcoming meals data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Meal removed",
        description: `${meal.title} has been removed from your selections.`
      });
    } catch (error) {
      // Revert local count on error
      setLocalSelectedCount(prev => prev + 1);
      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Save selection handler
  const handleSaveSelection = async () => {
    if (!orderId) return;

    // Validation: Check if we have the exact number of meals required
    if (localSelectedCount !== mealCount) {
      toast({
        title: "Invalid Selection",
        description: `Please select exactly ${mealCount} meals. You currently have ${localSelectedCount} selected.`,
        variant: "destructive",
      });
      return;
    }

    console.log(`Attempting to save selection for order ${orderId} with ${localSelectedCount} meals`);

    try {
      const response = await apiRequest('POST', `/api/orders/${orderId}/save-selection`);
      console.log('Save selection response:', response);

      // Update local saved state
      setIsSaved(true);

      // Force refresh all related queries to ensure persistence
      await queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      await queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Selection saved",
        description: "Your meal selection has been saved successfully."
      });
    } catch (error) {
      console.error('Save selection error:', error);
      toast({
        title: "Error",
        description: "Failed to save selection. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Switch back to edit mode
  const handleEdit = () => {
    setIsSaved(false);
  };

  // Group meals by ID and count for display
  const groupMealsByCount = (items: WeekItem[]) => {
    const groups: { [key: number]: { meal: Meal; items: WeekItem[] } } = {};
    
    items.forEach(item => {
      if (!groups[item.mealId]) {
        groups[item.mealId] = {
          meal: item.meal,
          items: []
        };
      }
      groups[item.mealId].items.push(item);
    });
    
    return Object.values(groups);
  };

  // Debug information
  console.log("Meal selector received items:", items);
  console.log("Meal selector received mealCount:", mealCount);
  
  // Properly calculate the number of selected meals (make sure items is defined)
  const selectedCount = items?.length || 0;
  const maxMeals = mealCount || 3; // Default to 3 if not specified
  
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
          
          {items.length > 0 ? (
            <div className="space-y-4">
              {groupMealsByCount(items).map((group: any, index: number) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center p-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden mr-4">
                      {group.meal.imageUrl && (
                        <img 
                          src={group.meal.imageUrl} 
                          alt={group.meal.title} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{group.meal.title}</h4>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        <span>{group.meal.calories || 0} cal</span>
                        <span className="mx-2">•</span>
                        <span>{group.meal.protein || 0}g protein</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium text-lg">
                        {group.items.length} meal{group.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {group.items.filter((item: WeekItem) => item.portionSize === 'standard').length > 0 && 
                          `${group.items.filter((item: WeekItem) => item.portionSize === 'standard').length} standard`}
                        {group.items.filter((item: WeekItem) => item.portionSize === 'large').length > 0 && 
                          `, ${group.items.filter((item: WeekItem) => item.portionSize === 'large').length} large`}
                      </div>
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
                {localSelectedCount} of {mealCount} selected
              </span>
              {orderId && (
                <Button 
                  onClick={() => {
                    console.log('Save Selection button clicked!', { orderId, selectedCount: localSelectedCount, maxMeals: mealCount });
                    handleSaveSelection();
                  }}
                  className={`text-white ${
                    localSelectedCount === mealCount 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  size="sm"
                  disabled={localSelectedCount !== mealCount || !orderId}
                  title={localSelectedCount !== mealCount ? `Need exactly ${mealCount} meals, have ${localSelectedCount}` : 'Save your selection'}
                >
                  Save Selection
                </Button>
              )}
            </div>
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

            </>
          )}
        </>
      )}
    </div>
  );
}