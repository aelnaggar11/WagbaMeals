import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const PaymentSuccessPage = () => {
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Invalidate queries to refresh order data
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    
    // Simulate processing delay for better UX
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Processing your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="max-w-md w-full" data-testid="card-payment-success">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" data-testid="icon-success" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-success-title">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-400" data-testid="text-success-message">
            Thank you for your payment. Your order has been confirmed and will be prepared for delivery.
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-500">
            You'll receive a confirmation email shortly with your order details.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={() => navigate('/account')} 
              className="w-full"
              data-testid="button-view-orders"
            >
              View My Orders
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full"
              data-testid="button-home"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
