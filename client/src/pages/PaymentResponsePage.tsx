import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

const PaymentResponsePage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check authentication status
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  
  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return;

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

      // Redirect based on auth status
      setTimeout(() => {
        if (user) {
          navigate('/account');
        } else {
          // If not authenticated, redirect to login with return path
          window.location.href = '/auth?returnTo=' + encodeURIComponent('/account');
        }
      }, 1500);
    } else {
      // Show failure toast
      toast({
        title: "Payment Failed",
        description: "We couldn't process your payment. Please try again with a different payment method.",
        variant: "destructive",
        duration: 4000,
      });

      // Redirect to checkout or home based on auth status
      setTimeout(() => {
        if (user) {
          navigate('/checkout');
        } else {
          navigate('/');
        }
      }, 2000);
    }
  }, [user, isLoading, navigate, toast]);

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
