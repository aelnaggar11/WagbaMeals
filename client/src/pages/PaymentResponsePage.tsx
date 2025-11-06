import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const PaymentResponsePage = () => {
  const { toast } = useToast();
  
  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';

    // Invalidate queries to refresh order data
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

    if (isSuccess) {
      // Show success toast
      toast({
        title: "Payment Successful!",
        description: "Your order has been confirmed and will be prepared for delivery.",
        duration: 3000,
      });

      // Always redirect to account page with full page reload to re-establish session
      // This prevents intermittent issues where session isn't recognized after Paymob redirect
      setTimeout(() => {
        window.location.href = '/account';
      }, 1500);
    } else {
      // Show failure toast
      toast({
        title: "Payment Failed",
        description: "We couldn't process your payment. Please try again with a different payment method.",
        variant: "destructive",
        duration: 4000,
      });

      // Redirect to checkout with full page reload
      setTimeout(() => {
        window.location.href = '/checkout';
      }, 2000);
    }
  }, [toast]);

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
