import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import WeekSelector from "@/components/WeekSelector";
import MealCard from "@/components/MealCard";
import OrderSummary from "@/components/OrderSummary";
import ProgressIndicator from "@/components/ProgressIndicator";
import DeliverySlotSelector from "@/components/DeliverySlotSelector";
import { Meal, PortionSize, OrderItem, DeliverySlot } from "@shared/schema";
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
  // Default to 10 meals (recommended option) during onboarding, 6 for existing users
  const defaultMealCount = params.get("fromPlan") ? "10" : "6";
  const initialMealCount = parseInt(params.get("mealCount") || defaultMealCount, 10);
  const initialPortionSize = params.get("portionSize") || "standard";

  const [mealCount, setMealCount] = useState(initialMealCount);
  const [portionSize, setPortionSize] = useState<string>(initialPortionSize);
  const [selectedMeals, setSelectedMeals] = useState<OrderItem[]>([]);
  const [deliverySlot, setDeliverySlot] = useState<DeliverySlot>("morning");

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

  // Handle browser back button properly
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Check if we're in onboarding flow
      if (params.get("fromPlan") && params.get("mealCount")) {
        // Navigate back to meal plans page
        setLocation("/meal-plans");
        return;
      }
      // For other cases, let default behavior handle it
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setLocation, params]);

  // Update selections if existing order is found or if there are stored selections in session
  useEffect(() => {
    // First check for stored selections from previous session (after login redirect)
    const storedSelectionsString = sessionStorage.getItem('mealSelections');
    if (storedSelectionsString) {
      try {
        const storedSelections = JSON.parse(storedSelectionsString);
        if (storedSelections.weekId === weekId) {
          setMealCount(storedSelections.mealCount);
          setPortionSize(storedSelections.portionSize);
          setSelectedMeals(storedSelections.selectedMeals);
          if (storedSelections.deliverySlot) {
            setDeliverySlot(storedSelections.deliverySlot);
          }
          // Clear the stored selections to avoid reusing them unintentionally
          sessionStorage.removeItem('mealSelections');

          toast({
            title: "Selections Restored",
            description: "Your meal selections have been restored.",
          });
        }
      } catch (error) {
        console.error("Error parsing stored selections:", error);
      }
    } 
    // Load existing order data when coming from account page (not onboarding)
    else if (existingOrder && !params.get("fromPlan") && params.get("fromAccount")) {
      setMealCount(existingOrder.mealCount);
      setPortionSize(existingOrder.defaultPortionSize);
      setSelectedMeals(existingOrder.items);
    }
    // If in onboarding flow, handle both URL parameters and existing order restoration
    else if (params.get("fromPlan")) {
      const urlMealCount = parseInt(params.get("mealCount") || "10", 10);
      const urlPortionSize = params.get("portionSize") || "standard";
      
      // If there's an existing order (returning from checkout), use its data
      if (existingOrder && existingOrder.items.length > 0) {
        console.log('Onboarding flow: restoring from existing order -', {
          mealCount: existingOrder.mealCount,
          portionSize: existingOrder.defaultPortionSize,
          itemsCount: existingOrder.items.length
        });
        setMealCount(existingOrder.mealCount);
        setPortionSize(existingOrder.defaultPortionSize);
        setSelectedMeals(existingOrder.items);
      } else {
        // No existing order, use URL parameters
        console.log('Onboarding flow: using URL parameters -', {
          mealCount: urlMealCount,
          portionSize: urlPortionSize,
          fromPlan: params.get("fromPlan")
        });
        
        // Only update if different from current state to avoid unnecessary re-renders
        if (mealCount !== urlMealCount) {
          setMealCount(urlMealCount);
        }
        if (portionSize !== urlPortionSize) {
          setPortionSize(urlPortionSize);
        }
      }
    }
  }, [existingOrder, weekId, toast, params]);

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
    { id: 2, label: "Your Selections" },
    { id: 3, label: "Create Account" },
    { id: 4, label: "Complete Checkout" }
  ];

  return (
    <div className="bg-white py-8">
      <div className="container mx-auto px-4">
        {/* Only show Progress Indicator during onboarding, not when coming from account page */}
        {!params.get("fromAccount") && <ProgressIndicator steps={steps} currentStep={2} />}

        <div className="mb-8 mt-6">
          {/* Back Button for onboarding flow */}
          {!params.get("fromAccount") && (
            <div className="flex justify-start mb-4">
              <Link href="/meal-plans">
                <Button variant="ghost" className="flex items-center text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Plans
                </Button>
              </Link>
            </div>
          )}

          {/* Title and navigation when coming from account page */}
          {params.get("fromAccount") && (
            <div className="flex flex-col mb-4">
              <div className="flex justify-between items-center mb-2">
                <Button 
                  variant="ghost" 
                  className="flex items-center text-gray-600"
                  onClick={() => window.location.href = '/account'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Account
                </Button>
                <div></div>
              </div>
              <h1 className="text-2xl font-bold text-primary mb-4">Select Your Meals</h1>
              <div className="bg-red-100 p-4 rounded-lg mb-6 flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-red-800">Order can be changed until the deadline</p>
                  <p className="text-sm text-red-700">Make your meal selections before the order deadline</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Week Selection - Always show */}
        <WeekSelector currentWeekId={weekId} />

        {/* Delivery Slot Selector - Always show */}
        <div className="max-w-md mx-auto mb-8 bg-white p-6 rounded-lg shadow-sm border">
          <DeliverySlotSelector
            value={deliverySlot}
            onChange={(slot) => {
              console.log('Delivery slot changed to:', slot);
              setDeliverySlot(slot);
            }}
          />
        </div>

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

        {/* All Meals */}
        <div className="max-w-6xl mx-auto mb-10">
          <div className="space-y-4">
            {(menuData as any)?.meals?.map((meal: Meal) => {
              const count = getMealCount(meal.id);
              const isSelected = count > 0;
              const isMaxReached = selectedMeals.length >= mealCount;

              return (
                <div key={meal.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.title} 
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">{meal.title}</h3>
                      </div>
                    </div>

                    {/* Buttons - positioned right on desktop, below title on mobile */}
                    <div className="flex items-center justify-end sm:justify-start space-x-2 flex-shrink-0">
                      {/* Standard controls for non-mixed portion sizes */}
                      {portionSize !== 'mixed' && (
                        <>
                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            className={`p-2 rounded-full ${isSelected ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                            disabled={!isSelected}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <span className="w-8 text-center font-medium">
                            {count}
                          </span>

                          <button
                            onClick={() => handleSelectMeal(meal.id, portionSize as PortionSize)}
                            className={`p-2 rounded-full ${(!isMaxReached || isSelected) ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 cursor-not-allowed'}`}
                            disabled={isMaxReached && !isSelected}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </>
                      )}

                      {/* Mix & Match controls */}
                      {portionSize === 'mixed' && (
                        <>
                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            className={`p-2 rounded-full ${isSelected ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                            disabled={!isSelected}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <span className="w-8 text-center font-medium">
                            {count}
                          </span>

                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleSelectMeal(meal.id, 'standard')}
                              className={`px-3 py-1 text-xs rounded ${(!isMaxReached || isSelected) ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                              disabled={isMaxReached && !isSelected}
                            >
                              Std
                            </button>
                            <button
                              onClick={() => handleSelectMeal(meal.id, 'large')}
                              className={`px-3 py-1 text-xs rounded ${(!isMaxReached || isSelected) ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                              disabled={isMaxReached && !isSelected}
                            >
                              Large
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nutritional info moved to its own row at the bottom */}
                  <div className="border-t px-4 py-2 bg-gray-50 text-xs text-gray-600">
                    {(portionSize === 'mixed' || portionSize === 'mix') ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><strong>Std:</strong> {meal.calories || 0} cal, {meal.protein || 0}g protein</span>
                        <span className="text-gray-400">•</span>
                        <span><strong>Large:</strong> {meal.caloriesLarge || Math.round((meal.calories || 0) * 1.5)} cal, {meal.proteinLarge || Math.round((meal.protein || 0) * 1.5)}g protein</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>
                          {portionSize === 'large' ? 
                            (meal.caloriesLarge || Math.round((meal.calories || 0) * 1.5)) : 
                            (meal.calories || 0)
                          } cal
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>
                          {portionSize === 'large' ? 
                            (meal.proteinLarge || Math.round((meal.protein || 0) * 1.5)) : 
                            (meal.protein || 0)
                          }g protein
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Show portion breakdown for Mix & Match */}
                  {portionSize === 'mixed' && isSelected && (
                    <div className="border-t bg-gray-50 px-4 py-3">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Selected portions: </span>
                        {(() => {
                          const mealPortions = selectedMeals.filter(item => item.mealId === meal.id);
                          const portionCounts = mealPortions.reduce((acc, item) => {
                            acc[item.portionSize] = (acc[item.portionSize] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          return Object.entries(portionCounts).map(([size, count], idx) => (
                            <span key={size}>
                              {idx > 0 && ', '}
                              {count}x {size.charAt(0).toUpperCase() + size.slice(1)}
                              {size === 'large' && (
                                <span className="text-green-600 font-medium"> (+EGP 99 each)</span>
                              )}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="mt-10">
          <OrderSummary
            selectedMeals={selectedMeals}
            mealCount={mealCount}
            portionSize={portionSize}
            weekId={weekId}
            deliverySlot={deliverySlot}
          />
        </div>
      </div>
    </div>
  );
};

export default MenuSelection;