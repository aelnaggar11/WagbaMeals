import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const PaymentFailurePage = () => {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Invalidate queries to refresh order data
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="max-w-md w-full" data-testid="card-payment-failure">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" data-testid="icon-failure" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-failure-title">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-400" data-testid="text-failure-message">
            We couldn't process your payment. This could be due to insufficient funds, incorrect card details, or a temporary issue with your payment method.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              <strong>Don't worry!</strong> Your order has been saved and you can try again with a different payment method or update your payment information.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={() => navigate('/checkout')} 
              className="w-full"
              data-testid="button-retry-payment"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/account')}
              className="w-full"
              data-testid="button-view-orders"
            >
              View My Orders
            </Button>
            <Button 
              variant="ghost" 
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

export default PaymentFailurePage;
