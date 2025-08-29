import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Simple inline meal selector that directly fetches and displays meals
export default function SimpleInlineMealSelector({ weekId, orderId, mealCount, items, subscriptionType = 'standard' }) {
  const { toast } = useToast();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all meals
  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', '/api/meals');
        
        if (response && Array.isArray(response.meals)) {
          console.log("Loaded meals:", response.meals.length);
          setMeals(response.meals);
        } else {
          console.error("Unexpected response format:", response);
          setMeals([]);
        }
      } catch (error) {
        console.error("Error fetching meals:", error);
        toast({
          title: "Error",
          description: "Failed to load meals. Please try again later."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, [toast]);

  const handleAddMeal = async (meal) => {
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

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
      
      toast({
        title: "Meal added",
        description: `${meal.title} has been added to your selections.`
      });
    } catch (error) {
      console.error("Error adding meal:", error);
      toast({
        title: "Error",
        description: "Failed to add meal. Please try again."
      });
    }
  };

  const handleRemoveMeal = async (meal) => {
    // Find the item in selectedItems
    const itemToRemove = items.find(item => item.mealId === meal.id);
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
      console.error("Error removing meal:", error);
      toast({
        title: "Error",
        description: "Failed to remove meal. Please try again."
      });
    }
  };

  // Get count of a particular meal in selections
  const getMealCount = (mealId) => {
    return items.filter(item => item.mealId === mealId).length;
  };

  if (loading) {
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
          {items.length} of {mealCount} selected
        </span>
      </div>

      {meals.length > 0 ? (
        <div className="space-y-4">
          {meals.map((meal) => {
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
                      {(subscriptionType === 'mixed' || subscriptionType === 'mix') ? (
                        <>
                          <span>Standard: {meal.calories || 0} cal, {meal.protein || 0}g protein</span>
                          <span className="mx-2">•</span>
                          <span>Large: {meal.caloriesLarge || Math.round(meal.calories * 1.5)} cal, {meal.proteinLarge || Math.round(meal.protein * 1.5)}g protein</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {subscriptionType === 'large' ? 
                              (meal.caloriesLarge || Math.round(meal.calories * 1.5)) : 
                              (meal.calories || 0)
                            } cal
                          </span>
                          <span className="mx-2">•</span>
                          <span>
                            {subscriptionType === 'large' ? 
                              (meal.proteinLarge || Math.round(meal.protein * 1.5)) : 
                              (meal.protein || 0)
                            }g protein
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
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