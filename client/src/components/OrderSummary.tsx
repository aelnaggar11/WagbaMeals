import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Meal, OrderItem, getPriceForMealCount } from "@shared/schema";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrderSummaryProps {
  selectedMeals: OrderItem[];
  mealCount: number;
  portionSize: string;
  weekId: string;
  onEdit?: (section: 'plan' | 'meals') => void;
  showCheckoutButton?: boolean;
}

const OrderSummary = ({ 
  selectedMeals, 
  mealCount, 
  portionSize,
  weekId,
  onEdit,
  showCheckoutButton = true
}: OrderSummaryProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Get menu data to display meal info
  const { data: menuData } = useQuery<{ meals: Meal[] }>({
    queryKey: [`/api/menu/${weekId}`],
  });

  const getMealById = (id: number) => {
    return menuData?.meals.find(meal => meal.id === id);
  };

  // Calculate prices based on meal count and portion size
  const pricePerMeal = getPriceForMealCount(mealCount);
  const largePortionAdditional = 99;

  const calculateMealPrice = (orderItem: OrderItem) => {
    const basePrice = pricePerMeal;
    if (orderItem.portionSize === "large") {
      return basePrice + largePortionAdditional;
    }
    return basePrice;
  };

  const calculateSubtotal = () => {
    return selectedMeals.reduce((sum, item) => sum + calculateMealPrice(item), 0);
  };

  const calculateDiscountAmount = () => {
    const fullPriceTotal = mealCount * 249; // Base price without discount
    return fullPriceTotal - calculateSubtotal();
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  // Get user authentication status
  const { data: user } = useQuery<{ id: number } | null>({
    queryKey: ['/api/auth/me'],
  });

  const handleCheckout = async () => {
    if (selectedMeals.length < mealCount) {
      toast({
        title: "Incomplete Selection",
        description: `Please select all ${mealCount} meals before proceeding to checkout.`,
        variant: "destructive"
      });
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to checkout. Please sign in or create an account.",
        variant: "destructive"
      });
      // Redirect to auth page with return URL
      window.location.href = `/auth?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('POST', '/api/orders', {
        weekId,
        mealCount,
        defaultPortionSize: portionSize,
        items: selectedMeals
      });

      // Redirect to checkout page
      window.location.href = '/checkout';
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "There was a problem saving your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 font-poppins">Your Order Summary</h2>
        
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Weekly Plan</h3>
            {onEdit && (
              <button 
                className="text-accent-foreground hover:text-primary text-sm underline focus:outline-none"
                onClick={() => onEdit('plan')}
              >
                Edit
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="text-primary mr-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <h4 className="font-medium">{mealCount} meals per week</h4>
                  <p className="text-sm text-gray-600">{portionSize === "mixed" ? "Mixed Portions" : `${portionSize.charAt(0).toUpperCase() + portionSize.slice(1)} Portion`}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="text-primary mr-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <h4 className="font-medium">Weekly Delivery</h4>
                  <p className="text-sm text-gray-600">Week of {weekId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Selected Meals</h3>
            {onEdit && (
              <button 
                className="text-accent-foreground hover:text-primary text-sm underline focus:outline-none"
                onClick={() => onEdit('meals')}
              >
                Edit
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {Object.values(selectedMeals.reduce((acc, item) => {
              const key = `${item.mealId}-${item.portionSize}`;
              if (!acc[key]) {
                acc[key] = { ...item, count: 1 };
              } else {
                acc[key].count++;
              }
              return acc;
            }, {} as Record<string, OrderItem & { count: number }>)).map((item) => {
              const meal = getMealById(item.mealId);
              return meal ? (
                <div key={`${item.mealId}-${item.portionSize}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img 
                      src={meal.imageUrl} 
                      alt={meal.title} 
                      className="w-12 h-12 object-cover rounded-md mr-3"
                    />
                    <div>
                      <h4 className="font-medium">
                        {meal.title} {item.count > 1 && <span className="text-sm text-gray-600">×{item.count}</span>}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.portionSize.charAt(0).toUpperCase() + item.portionSize.slice(1)} Portion
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">EGP {calculateMealPrice(item) * item.count}</span>
                </div>
              ) : null;
            })}
            
            {selectedMeals.length < mealCount && (
              <div className="flex items-center justify-between text-gray-400">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">{mealCount - selectedMeals.length} more meals to select</h4>
                    <p className="text-sm">Complete your selection</p>
                  </div>
                </div>
                <span className="font-medium">
                  EGP {(mealCount - selectedMeals.length) * pricePerMeal}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3 mb-8">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal ({mealCount} meals)</span>
            <span className="font-medium">EGP {(mealCount * 249).toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="font-medium">EGP 0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Discount ({mealCount} meals plan)</span>
            <span className="font-medium text-accent">-EGP {calculateDiscountAmount().toFixed(0)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-200">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg text-primary">EGP {calculateTotal().toFixed(0)}</span>
          </div>
        </div>
        
        {showCheckoutButton && (
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium transition duration-300"
            onClick={handleCheckout}
            disabled={isSubmitting || selectedMeals.length < mealCount}
          >
            {isSubmitting ? "Processing..." : "Proceed to Checkout"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
