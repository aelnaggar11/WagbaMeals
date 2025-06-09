import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Meal, OrderItem, PortionSize } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CacheManager } from "@/lib/cacheManager";
import { MinusCircle, PlusCircle } from "lucide-react";

interface MealSelectionPanelProps {
  weekId: number;
  orderId: number | null;
  mealCount: number;
  canEdit: boolean;
  isSkipped: boolean;
  selectedItems: Array<{
    id: number;
    mealId: number;
    portionSize: string;
    meal: Meal;
  }>;
}

const MealSelectionPanel = ({
  weekId,
  orderId,
  mealCount,
  canEdit,
  isSkipped,
  selectedItems
}: MealSelectionPanelProps) => {
  const { toast } = useToast();
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);

  // Convert selectedItems to OrderItems
  useEffect(() => {
    const orderItems = selectedItems.map(item => ({
      mealId: item.mealId,
      portionSize: item.portionSize as PortionSize
    }));
    setSelectedMeals(orderItems);
  }, [selectedItems]);

  // Fetch all available meals
  useEffect(() => {
    const fetchAllMeals = async () => {
      setIsLoadingMeals(true);
      try {
        const response: any = await apiRequest('GET', '/api/meals');
        if (response && response.meals) {
          setAvailableMeals(response.meals);
        }
      } catch (error) {
        console.error("Error fetching meals:", error);
        toast({
          title: "Error",
          description: "Failed to load available meals.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingMeals(false);
      }
    };

    fetchAllMeals();
  }, [toast]);

  // Check if a meal is already selected
  const getMealCount = (mealId: number): number => {
    return selectedMeals.filter(item => item.mealId === mealId).length;
  };

  // Handle adding a meal
  const handleAddMeal = async (meal: Meal) => {
    // Check if maximum meals already selected
    if (selectedMeals.length >= mealCount) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`,
        variant: "destructive"
      });
      return;
    }

    // Default to standard portion
    const newMeal: OrderItem = {
      mealId: meal.id,
      portionSize: "standard"
    };

    // Update local state
    setSelectedMeals([...selectedMeals, newMeal]);

    try {
      // If order exists, add to it
      if (orderId) {
        await apiRequest('POST', `/api/orders/${orderId}/items`, newMeal);
      } else {
        // Create new order with this meal
        await apiRequest('POST', '/api/orders', {
          weekId,
          mealCount,
          defaultPortionSize: "standard",
          items: [newMeal]
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });

      toast({
        title: "Meal added",
        description: `${meal.title} has been added to your selections.`
      });
    } catch (error) {
      // Revert local state
      setSelectedMeals(selectedMeals);

      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle removing a meal
  const handleRemoveMeal = async (meal: Meal) => {
    // Find the meal in selections (get the first one if there are duplicates)
    const mealIndex = selectedMeals.findIndex(item => item.mealId === meal.id);
    if (mealIndex === -1 || !orderId) return;

    // Update local state
    const updatedMeals = [...selectedMeals];
    updatedMeals.splice(mealIndex, 1);
    setSelectedMeals(updatedMeals);

    try {
      // Find the actual order item ID from the selectedItems
      const orderItemIndex = selectedItems.findIndex(item => item.mealId === meal.id);
      if (orderItemIndex !== -1) {
        const orderItemId = selectedItems[orderItemIndex].id;

        // Remove from order
        await apiRequest('DELETE', `/api/orders/${orderId}/items/${orderItemId}`);

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });

        toast({
          title: "Meal removed",
          description: `${meal.title} has been removed from your selections.`
        });
      }
    } catch (error) {
      // Revert local state
      setSelectedMeals(selectedMeals);

      toast({
        title: "Error",
        description: "There was an error updating your meal selections. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Skip or unskip a delivery
  const handleSkipDelivery = async () => {
    try {
      if (!orderId) return;

      await apiRequest('PATCH', `/api/orders/${orderId}/skip`, {
        skip: !isSkipped
      });

      // Force immediate refetch of upcoming meals
      await queryClient.refetchQueries({ 
        queryKey: ['/api/user/upcoming-meals'],
        exact: true 
      });

      toast({
        title: isSkipped ? "Delivery unskipped" : "Delivery skipped",
        description: isSkipped ? "Your meals have been restored." : "Your delivery has been skipped for this week."
      });
    } catch (error) {
      console.error('Error skipping/unskipping delivery:', error);
      toast({
        title: "Error",
        description: "There was an error updating your delivery status. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isSkipped) {
    return null;
  }

  return (
    <div className="border rounded-lg p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Select Your Meals</h3>
        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
          {selectedMeals.length} of {mealCount} selected
        </span>
      </div>

      {isLoadingMeals ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {availableMeals.length > 0 ? (
            <div className="space-y-4">
              {availableMeals.map((meal) => {
                const count = getMealCount(meal.id);
                const isSelected = count > 0;
                const isMaxReached = selectedMeals.length >= mealCount;

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
                          <span>{meal.calories || "0"} cal</span>
                          <span className="mx-2">•</span>
                          <span>{meal.protein || "0"}g protein</span>
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex items-center">
                          <button
                            onClick={() => handleRemoveMeal(meal)}
                            className={`p-2 rounded-full ${isSelected ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                            disabled={!isSelected}
                          >
                            <MinusCircle size={24} />
                          </button>

                          <span className="w-8 text-center font-medium">
                            {count}
                          </span>

                          <button
                            onClick={() => handleAddMeal(meal)}
                            className={`p-2 rounded-full ${(!isMaxReached || isSelected) ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 cursor-not-allowed'}`}
                            disabled={isMaxReached && !isSelected}
                          >
                            <PlusCircle size={24} />
                          </button>
                        </div>
                      )}
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
};

export default MealSelectionPanel;