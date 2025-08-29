import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MinusCircle, PlusCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PricingService } from "@/lib/pricingService";

interface Meal {
  id: number;
  title: string;
  imageUrl: string;
  calories: number;
  protein: number;
  caloriesLarge?: number;
  proteinLarge?: number;
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
  defaultPortionSize?: string; // The user's subscription portion size preference
  disabled?: boolean; // Disable all meal selection functionality
}

export default function FixedMealSelector({
  weekId,
  orderId,
  mealCount = 3,
  items = [],
  defaultPortionSize = 'standard',
  disabled = false
}: FixedMealSelectorProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<WeekItem[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [largeMealAddOn, setLargeMealAddOn] = useState(99);

  // Load dynamic pricing
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const largeMealPrice = await PricingService.getLargeMealAddonPrice();
        setLargeMealAddOn(largeMealPrice);
      } catch (error) {
        console.error('Failed to load large meal pricing:', error);
      }
    };

    loadPricing();
  }, []);

  // Fetch meals for this week
  const { data, isLoading } = useQuery({
    queryKey: [`/api/menu/${weekId}`],
    enabled: !!weekId,
  });

  // Reset component state when items change
  useEffect(() => {
    // Always reset state when items prop changes
    if (items.length === 0) {
      // Clear everything when no items
      setSelectedItems([]);
      setSavedItems([]);
      setIsSaved(false);
      setIsInitialized(false);
    } else {
      // Initialize with provided items
      setSelectedItems(items);

      // Group the items by meal ID for display
      const grouped = groupMealsByCount(items);
      setSavedItems(grouped);

      // If we have items, consider the selection as saved
      setIsSaved(true);
      setIsInitialized(true);
    }
  }, [items, mealCount]); // Include mealCount to reset when it changes

  // Group meals by ID with their portion sizes
  const groupMealsByCount = (items: WeekItem[]) => {
    const groups: Record<number, { meal: Meal, items: WeekItem[] }> = {};

    items.forEach(item => {
      if (!groups[item.mealId]) {
        groups[item.mealId] = {
          meal: item.meal,
          items: [item]
        };
      } else {
        groups[item.mealId].items.push(item);
      }
    });

    return Object.values(groups);
  };

  // Get the count of a particular meal in selections
  const getMealCount = (mealId: number): number => {
    return selectedItems.filter(item => item.mealId === mealId).length;
  };

  // Update portion size for a specific meal item
  const handlePortionSizeChange = async (itemIndex: number, newPortionSize: string) => {
    try {
      const updatedItems = [...selectedItems];
      const item = updatedItems[itemIndex];

      // Update local state
      updatedItems[itemIndex] = { ...item, portionSize: newPortionSize };
      setSelectedItems(updatedItems);

      // Update on server if we have an order ID and item ID
      if (orderId && item.id) {
        const response = await fetch(`/api/orders/${orderId}/items/${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portionSize: newPortionSize
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update portion size');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update portion size. Please try again."
      });
    }
  };

  // Get all selected items for a specific meal
  const getSelectedItemsForMeal = (mealId: number): WeekItem[] => {
    return selectedItems.filter(item => item.mealId === mealId);
  };

  // Helper function to get count of portions for a specific meal and portion size
  const getPortionCount = (mealId: number, portionSize: string) => {
    return selectedItems.filter(item => item.mealId === mealId && item.portionSize === portionSize).length;
  };

  // Helper function to add a portion of specific size for a meal
  const handleAddPortion = async (mealId: number, portionSize: string) => {
    if (selectedItems.length >= parseInt(mealCount.toString())) {
      toast({
        title: "Maximum meals reached",
        description: `You can only select ${mealCount} meals for this week.`
      });
      return; // Already at max meals
    }

    // Get meals from the query data
    const mealsData = (data as any)?.meals || [];
    const meal = mealsData.find((m: any) => m.id === mealId);
    if (!meal) {
      console.error('Meal not found:', mealId);
      return;
    }

    try {
      if (orderId) {
        // Add to existing order
        const response = await fetch(`/api/orders/${orderId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mealId, portionSize })
        });

        if (response.ok) {
          const newItem = await response.json();
          setSelectedItems(prev => [...prev, {
            id: newItem.id,
            mealId,
            portionSize,
            meal
          }]);
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
        } else {
          throw new Error('Failed to add portion to order');
        }
      } else {
        // Local state only
        const newItem: WeekItem = {
          id: Date.now() + Math.random(), // Temporary ID
          mealId,
          portionSize,
          meal
        };
        setSelectedItems(prev => [...prev, newItem]);
      }
    } catch (error) {
      console.error('Error adding portion:', error);
      toast({
        title: "Error",
        description: "Failed to add meal portion. Please try again."
      });
    }
  };

  // Helper function to remove a portion of specific size for a meal
  const handleRemovePortion = async (mealId: number, portionSize: string) => {
    const itemToRemove = selectedItems.find(item => 
      item.mealId === mealId && item.portionSize === portionSize
    );

    if (!itemToRemove) {
      console.warn('No item found to remove for meal:', mealId, 'portion:', portionSize);
      return;
    }

    try {
      if (orderId && typeof itemToRemove.id === 'number' && itemToRemove.id < 1000000000000) {
        // Remove from existing order (only if it's a real database ID, not temporary)
        const response = await fetch(`/api/orders/${orderId}/items/${itemToRemove.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id));
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/user/upcoming-meals'] });
        } else {
          throw new Error('Failed to remove portion from order');
        }
      } else {
        // Local state only (or temporary ID)
        setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id));
      }
    } catch (error) {
      console.error('Error removing portion:', error);
      toast({
        title: "Error",
        description: "Failed to remove meal portion. Please try again."
      });
    }
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
      // Determine initial portion size based on subscription type
      let initialPortionSize = "standard";
      if (defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') {
        // For mixed subscriptions, default to standard but allow user to change
        initialPortionSize = "standard";
      } else if (defaultPortionSize === 'large') {
        initialPortionSize = "large";
      }

      // Create a new item
      const newItem: WeekItem = {
        id: Date.now(), // Temporary ID for UI
        mealId: meal.id,
        portionSize: initialPortionSize,
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
            portionSize: initialPortionSize
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add meal');
        }

        // Get the created item from response and update local state with real ID
        const createdItem = await response.json();

        // Update the local state with the real server ID
        setSelectedItems(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex] && updated[lastIndex].id === newItem.id) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              id: createdItem.id
            };
          }
          return updated;
        });
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

      // Delete from server if we have an order ID and a valid database ID (not a temporary ID)
      if (orderId && itemToRemove.id && typeof itemToRemove.id === 'number' && itemToRemove.id < 1000000000000) {
        const response = await fetch(`/api/orders/${orderId}/items/${itemToRemove.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.warn('Failed to delete item from server, but continuing with local removal');
        }
      }
    } catch (error) {
      console.warn('Error removing meal from server:', error);
      // Don't show error toast for server issues since local state is updated
    }
  };

  // Save the current meal selection
  const handleSave = async () => {
    const requiredMealCount = parseInt(mealCount.toString());
    if (selectedItems.length !== requiredMealCount) {
      toast({
        title: "Wrong number of meals",
        description: `Please select exactly ${requiredMealCount} meals before saving.`,
        variant: "destructive"
      });
      return;
    }

    // For mixed subscriptions, validate that all meals have portion sizes selected
    if (defaultPortionSize === 'mixed') {
      const missingPortions = selectedItems.filter(item => !item.portionSize || item.portionSize === '');
      if (missingPortions.length > 0) {
        toast({
          title: "Portion sizes required",
          description: "Please select a portion size for all meals before saving.",
          variant: "destructive"
        });
        return;
      }
    }

    if (!orderId) {
      toast({
        title: "Error",
        description: "No order ID available for saving.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the backend API to mark order as selected
      await apiRequest('POST', `/api/orders/${orderId}/save-selection`, {});

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
    } catch (error) {
      console.error('Error saving selection:', error);
      toast({
        title: "Error saving selection",
        description: "There was an error saving your selection. Please try again.",
        variant: "destructive"
      });
    }
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

  const meals = (data as any)?.meals || [];

  return (
    <div className="relative">
      {/* Disabled overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-gray-50 bg-opacity-90 z-10 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Meal Selection Disabled</h3>
            <p className="text-sm text-gray-600">
              Your subscription is cancelled. Please resume your subscription to select meals.
            </p>
          </div>
        </div>
      )}

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
              {savedItems.map((group: any, index: number) => {
                // Calculate portion size totals for mix & match
                const portionTotals = group.items.reduce((acc: any, item: WeekItem) => {
                  const size = item.portionSize || 'standard';
                  acc[size] = (acc[size] || 0) + 1;
                  return acc;
                }, {});

                return (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center p-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-4">
                        {group.meal.imageUrl && (
                          <img 
                            src={group.meal.imageUrl} 
                            alt={group.meal.title} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-lg">{group.meal.title}</h4>
                            <div className="mt-1 text-sm text-gray-600">
                              {(defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') ? (
                                <div className="space-y-1">
                                  <div>Standard: {group.meal.calories || 0} cal, {group.meal.protein || 0}g protein</div>
                                  <div>Large: {group.meal.caloriesLarge || Math.round(group.meal.calories * 1.5)} cal, {group.meal.proteinLarge || Math.round(group.meal.protein * 1.5)}g protein</div>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span>
                                    {defaultPortionSize === 'large' 
                                      ? group.meal.caloriesLarge || Math.round(group.meal.calories * 1.5) 
                                      : group.meal.calories || 0
                                    } cal
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span>
                                    {defaultPortionSize === 'large' 
                                      ? group.meal.proteinLarge || Math.round(group.meal.protein * 1.5) 
                                      : group.meal.protein || 0
                                    }g protein
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Total quantity badge */}
                          <Badge variant="secondary" className="mr-4">
                            x{group.items.length}
                          </Badge>
                        </div>

                        {/* Portion size summary - only show for Mix & Match subscriptions */}
                        {(defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') && (
                          <div className="mt-3">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Portions: </span>
                              {Object.entries(portionTotals).map(([size, count], idx) => (
                                <span key={size}>
                                  {idx > 0 && ', '}
                                  {count}x {size.charAt(0).toUpperCase() + size.slice(1)}
                                  {size === 'large' && (
                                    <span className="text-green-600 font-medium"> (+{largeMealAddOn} EGP each)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show default portion size for Standard/Large subscriptions */}
                        {defaultPortionSize !== 'mixed' && defaultPortionSize !== 'mix' && (
                          <div className="mt-2 text-sm text-gray-600">
                            All meals: {defaultPortionSize === 'large' ? 'Large' : 'Standard'} portion
                            {defaultPortionSize === 'large' && (
                              <span className="ml-2 text-green-600 font-medium">+{largeMealAddOn} EGP each</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                disabled={selectedItems.length !== parseInt(mealCount.toString())}
                className="flex items-center gap-2"
                size="sm"
                title={selectedItems.length !== parseInt(mealCount.toString()) ? `Need ${mealCount} meals, have ${selectedItems.length}` : 'Save your selection'}
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
                        <div className="mt-1 text-sm text-gray-600">
                          {(defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') ? (
                            <div className="space-y-1">
                              <div>Standard: {meal.calories || 0} cal, {meal.protein || 0}g protein</div>
                              <div>Large: {meal.caloriesLarge || Math.round(meal.calories * 1.5)} cal, {meal.proteinLarge || Math.round(meal.protein * 1.5)}g protein</div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span>
                                {defaultPortionSize === 'large' 
                                  ? meal.caloriesLarge || Math.round(meal.calories * 1.5) 
                                  : meal.calories || 0
                                } cal
                              </span>
                              <span className="mx-2">•</span>
                              <span>
                                {defaultPortionSize === 'large' 
                                  ? meal.proteinLarge || Math.round(meal.protein * 1.5) 
                                  : meal.protein || 0
                                }g protein
                              </span>
                            </div>
                          )}
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

                    {/* Mix & Match portion size counters - simplified UX */}
                    {(defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') && (
                      <div className="border-t bg-gray-50 p-4">
                        <Label className="text-sm font-medium mb-3 block">Choose Portion Sizes:</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Standard Portion Counter */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div>
                              <div className="font-medium text-sm">Standard</div>
                              <div className="text-xs text-gray-500">Regular portion</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                disabled={getPortionCount(meal.id, 'standard') === 0}
                                onClick={() => handleRemovePortion(meal.id, 'standard')}
                              >
                                <MinusCircle size={16} />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {getPortionCount(meal.id, 'standard')}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                disabled={selectedItems.length >= parseInt(mealCount.toString())}
                                onClick={() => handleAddPortion(meal.id, 'standard')}
                              >
                                <PlusCircle size={16} />
                              </Button>
                            </div>
                          </div>

                          {/* Large Portion Counter */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div>
                              <div className="font-medium text-sm">Large</div>
                              <div className="text-xs text-gray-500">+{largeMealAddOn} EGP each</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                disabled={getPortionCount(meal.id, 'large') === 0}
                                onClick={() => handleRemovePortion(meal.id, 'large')}
                              >
                                <MinusCircle size={16} />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {getPortionCount(meal.id, 'large')}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                disabled={selectedItems.length >= parseInt(mealCount.toString())}
                                onClick={() => handleAddPortion(meal.id, 'large')}
                              >
                                <PlusCircle size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show default portion size for Standard/Large subscriptions */}
                    {isSelected && defaultPortionSize !== 'mixed' && defaultPortionSize !== 'mix' && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="text-sm text-gray-600">
                          All meals: {defaultPortionSize === 'large' ? 'Large' : 'Standard'} portion
                          {defaultPortionSize === 'large' && (
                            <span className="ml-2 text-green-600 font-medium">+{largeMealAddOn} EGP each</span>
                          )}
                        </div>
                      </div>
                    )}
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