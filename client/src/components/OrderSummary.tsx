import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Meal, OrderItem, getPriceForMealCount, DeliverySlot } from "@shared/schema";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrderSummaryProps {
  selectedMeals: OrderItem[];
  mealCount: number;
  portionSize: string;
  weekId: string;
  deliverySlot?: DeliverySlot;
  onEdit?: (section: 'plan' | 'meals') => void;
  showCheckoutButton?: boolean;
}

const OrderSummary = ({ 
  selectedMeals, 
  mealCount, 
  portionSize,
  weekId,
  deliverySlot = "morning",
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

    // Check if this is during onboarding flow
    const isOnboardingFlow = window.location.search.includes('fromPlan') || 
                           window.location.pathname.includes('/menu/') && !window.location.search.includes('fromAccount');

    // During onboarding, go to auth page if user is not authenticated, skip to checkout if already authenticated
    if (isOnboardingFlow) {
      if (!user) {
        // User not authenticated - go to Step 3 (Create Account)
        try {
          // Save selections to backend session storage (more reliable than sessionStorage)
          await apiRequest('POST', '/api/temp/meal-selections', {
            weekId,
            mealCount,
            portionSize,
            selectedMeals,
            deliverySlot
          });
          
          // Also save to sessionStorage as fallback
          const selections = {
            selectedMeals,
            mealCount,
            portionSize,
            weekId,
            deliverySlot
          };
          sessionStorage.setItem('mealSelections', JSON.stringify(selections));
          
          // Add onboarding context to URL parameters
          const authUrl = `/auth?fromSelection=true&weekId=${weekId}&mealCount=${mealCount}&portionSize=${portionSize}`;
          window.location.href = authUrl;
          return;
        } catch (error) {
          console.error('Error saving meal selections:', error);
          // Continue with just sessionStorage if backend fails
          const authUrl = `/auth?fromSelection=true&weekId=${weekId}&mealCount=${mealCount}&portionSize=${portionSize}`;
          window.location.href = authUrl;
          return;
        }
      }
      // If user IS authenticated during onboarding, continue to create order directly (skip Step 3)
    }

    // For non-onboarding flow, check authentication
    if (!isOnboardingFlow && !user) {
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
        items: selectedMeals,
        deliverySlot
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
        {/* Delivery Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Delivery Information</h3>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">Time:</span>
            <span className="font-medium">
              {deliverySlot === 'morning' ? 'Morning (09:00 - 12:00)' : 'Evening (18:00 - 21:00)'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">You can change your delivery time above if needed</p>
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
