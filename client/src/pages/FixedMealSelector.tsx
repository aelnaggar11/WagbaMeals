import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MinusCircle, PlusCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  defaultPortionSize?: string; // The user's subscription portion size preference
}

export default function FixedMealSelector({
  weekId,
  orderId,
  mealCount = 3,
  items = [],
  defaultPortionSize = 'standard'
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
      if (defaultPortionSize === 'mixed') {
        // For mixed subscriptions, require user to choose
        initialPortionSize = "";
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

  const meals = (data as any)?.meals || [];

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
              {savedItems.map((group: any, index: number) => (
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
                          <div className="flex items-center mt-1 text-sm text-gray-600">
                            <span>{group.meal.calories || 0} cal</span>
                            <span className="mx-2">•</span>
                            <span>{group.meal.protein || 0}g protein</span>
                          </div>
                        </div>
                        
                        {/* Quantity badge */}
                        {group.items.length > 1 && (
                          <Badge variant="secondary" className="mr-4">
                            x{group.items.length}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Portion size controls - only show for Mix & Match subscriptions */}
                      {(defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') && (
                        <div className="mt-3 space-y-2">
                          {group.items.map((mealItem: WeekItem, itemIndex: number) => {
                            const actualIndex = selectedItems.findIndex(item => item.id === mealItem.id);
                            return (
                              <div key={mealItem.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  {group.items.length > 1 ? `Meal ${itemIndex + 1}:` : 'Portion:'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={mealItem.portionSize || "standard"}
                                    onValueChange={(value) => handlePortionSizeChange(actualIndex, value)}
                                  >
                                    <SelectTrigger className="w-24 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="large">Large</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {mealItem.portionSize === 'large' && (
                                    <span className="text-xs text-green-600 font-medium">+99 EGP</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Show default portion size for Standard/Large subscriptions */}
                      {defaultPortionSize !== 'mixed' && defaultPortionSize !== 'mix' && (
                        <div className="mt-2 text-sm text-gray-600">
                          All meals: {defaultPortionSize === 'large' ? 'Large' : 'Standard'} portion
                          {defaultPortionSize === 'large' && (
                            <span className="ml-2 text-green-600 font-medium">+99 EGP each</span>
                          )}
                        </div>
                      )}
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
                    
                    {/* Individual portion size controls for selected meals - only show for Mix & Match */}
                    {isSelected && (defaultPortionSize === 'mixed' || defaultPortionSize === 'mix') && (
                      <div className="border-t bg-gray-50 p-4">
                        <Label className="text-sm font-medium mb-3 block">Portion Sizes:</Label>
                        <div className="space-y-2">
                          {getSelectedItemsForMeal(meal.id).map((item, itemIndex) => {
                            const globalItemIndex = selectedItems.findIndex(si => si.id === item.id);
                            return (
                              <div key={item.id} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Meal {itemIndex + 1}:</span>
                                <Select
                                  value={item.portionSize}
                                  onValueChange={(value) => handlePortionSizeChange(globalItemIndex, value)}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder={defaultPortionSize === 'mixed' ? "Choose size" : item.portionSize} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {defaultPortionSize === 'mixed' && (
                                      <SelectItem value="" disabled>Choose size</SelectItem>
                                    )}
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="large">Large (+99 EGP)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Show default portion size for Standard/Large subscriptions */}
                    {isSelected && defaultPortionSize !== 'mixed' && defaultPortionSize !== 'mix' && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="text-sm text-gray-600">
                          All meals: {defaultPortionSize === 'large' ? 'Large' : 'Standard'} portion
                          {defaultPortionSize === 'large' && (
                            <span className="ml-2 text-green-600 font-medium">+99 EGP each</span>
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
