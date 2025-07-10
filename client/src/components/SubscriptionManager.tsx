import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface SubscriptionData {
  subscriptionStatus: 'active' | 'paused' | 'cancelled';
  subscriptionPausedAt?: string;
  subscriptionCancelledAt?: string;
  createdAt: string;
}

const SubscriptionManager = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery<SubscriptionData>({
    queryKey: ['/api/user/subscription'],
    queryFn: async () => {
      const response = await fetch('/api/user/subscription', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch subscription data');
      }
      return response.json();
    }
  });

  const pauseSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/user/subscription/pause', {
        method: 'PATCH'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      toast({
        title: "Subscription Paused",
        description: "Your subscription has been paused successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause subscription",
        variant: "destructive",
      });
    }
  });

  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/user/subscription/resume', {
        method: 'PATCH'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      toast({
        title: "Subscription Resumed",
        description: "Your subscription has been resumed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resume subscription",
        variant: "destructive",
      });
    }
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/user/subscription/cancel', {
        method: 'PATCH'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  });

  const handlePauseSubscription = async () => {
    setIsLoading(true);
    try {
      await pauseSubscriptionMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsLoading(true);
    try {
      await resumeSubscriptionMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      await cancelSubscriptionMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Paused</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load subscription information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(subscriptionData.subscriptionStatus)}
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge(subscriptionData.subscriptionStatus)}
              </div>
              <p className="text-sm text-gray-600">
                {subscriptionData.subscriptionStatus === 'active' && "Your subscription is active and deliveries will continue as scheduled."}
                {subscriptionData.subscriptionStatus === 'paused' && "Your subscription is paused. No deliveries will be made until you resume."}
                {subscriptionData.subscriptionStatus === 'cancelled' && "Your subscription has been cancelled. No future deliveries will be made."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Member since:</span>
            <span className="font-medium">
              {format(new Date(subscriptionData.createdAt), 'MMM dd, yyyy')}
            </span>
          </div>
          
          {subscriptionData.subscriptionPausedAt && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Paused on:</span>
                <span className="font-medium">
                  {format(new Date(subscriptionData.subscriptionPausedAt), 'MMM dd, yyyy')}
                </span>
              </div>
            </>
          )}

          {subscriptionData.subscriptionCancelledAt && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cancelled on:</span>
                <span className="font-medium">
                  {format(new Date(subscriptionData.subscriptionCancelledAt), 'MMM dd, yyyy')}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptionData.subscriptionStatus === 'active' && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handlePauseSubscription}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Processing..." : "Pause Subscription"}
                </Button>
                <p className="text-sm text-gray-600">
                  Pausing will stop all future deliveries until you resume. You can resume anytime.
                </p>
              </div>
            )}

            {subscriptionData.subscriptionStatus === 'paused' && (
              <div className="space-y-3">
                <Button
                  onClick={handleResumeSubscription}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Processing..." : "Resume Subscription"}
                </Button>
                <p className="text-sm text-gray-600">
                  Resume your subscription to continue receiving weekly deliveries.
                </p>
              </div>
            )}

            {subscriptionData.subscriptionStatus !== 'cancelled' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={isLoading}
                      >
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently cancel your subscription. You will no longer receive weekly meal deliveries. 
                          This action cannot be undone, but you can always create a new subscription later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Yes, Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-sm text-gray-600">
                    Permanently cancel your subscription. This cannot be undone.
                  </p>
                </div>
              </>
            )}

            {subscriptionData.subscriptionStatus === 'cancelled' && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  Your subscription has been cancelled. To start receiving deliveries again, 
                  you'll need to create a new subscription.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManager;