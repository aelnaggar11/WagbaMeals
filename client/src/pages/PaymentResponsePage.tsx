import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const PaymentResponsePage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';

    // Invalidate queries to refresh order data
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

    if (isSuccess) {
      // Show success toast
      toast({
        title: "Payment Successful!",
        description: "Your order has been confirmed and will be prepared for delivery.",
        duration: 3000,
      });

      // Redirect to account page after a brief delay
      setTimeout(() => {
        navigate('/account');
      }, 1500);
    } else {
      // Show failure toast
      toast({
        title: "Payment Failed",
        description: "We couldn't process your payment. Please try again with a different payment method.",
        variant: "destructive",
        duration: 4000,
      });

      // Redirect to checkout page to retry
      setTimeout(() => {
        navigate('/checkout');
      }, 2000);
    }
  }, [navigate, toast]);

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Processing payment...</p>
      </div>
    </div>
  );
};

export default PaymentResponsePage;
