import { Route, Switch, useLocation } from "wouter";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import MealPlans from "@/pages/MealPlans";
import MenuSelection from "@/pages/MenuSelection";
import CheckoutPage from "@/pages/CheckoutPage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AdminAuthPage from "@/pages/AdminAuthPage";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/Dashboard";
import MenuManagement from "@/pages/admin/MenuManagement";
import OrdersManagement from "@/pages/admin/OrdersManagement";
import MealsPage from "@/pages/MealsPage";
import PaymentResponsePage from "@/pages/PaymentResponsePage";
import { useQuery } from "@tanstack/react-query";
import { User, Admin } from "@shared/schema";
import { Loader2 } from "lucide-react";

function App() {
  const [location, navigate] = useLocation();
  
  // User authentication query with proper 401 handling
  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always refetch to ensure fresh auth state
    retry: (failureCount, error) => {
      // Don't retry 401 errors
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // User profile query to check onboarding completion status
  const { data: userProfile, isLoading: profileLoading } = useQuery<{
    hasUsedTrialBox: boolean;
    userType: string;
  } | null>({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!user, // Only fetch when user is authenticated
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Admin authentication query with proper 401 handling
  const { data: admin, isLoading: adminLoading } = useQuery<Admin | null>({
    queryKey: ['/api/admin/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/admin/auth/me', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always refetch to ensure fresh auth state
    retry: (failureCount, error) => {
      // Don't retry 401 errors
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    }
  });
  
  // Handle auth redirects with improved timing and onboarding protection
  useEffect(() => {
    const isUserRoute = 
      location.startsWith('/account') || 
      location.startsWith('/checkout');
    const isAdminRoute = location.startsWith('/admin');
    const isOnboardingRoute = 
      location === '/' || 
      location.startsWith('/meal-plans') || 
      location.startsWith('/menu/') ||
      location.startsWith('/auth');
    
    // Don't proceed if still loading auth or profile data
    if (userLoading || (user && profileLoading)) {
      return;
    }
      
    // Check if user has completed onboarding (trial box used or is subscriber)
    const hasCompletedOnboarding = userProfile?.hasUsedTrialBox || userProfile?.userType === 'subscriber';
    
    // Prevent access to /account during initial onboarding
    if (!userLoading && user && location.startsWith('/account') && !hasCompletedOnboarding) {
      // User is authenticated but hasn't completed onboarding - redirect to continue onboarding
      navigate('/meal-plans');
      return;
    }
    
    // Redirect authenticated users who have completed onboarding away from onboarding pages
    if (!userLoading && user && hasCompletedOnboarding && (location === '/' || location.startsWith('/meal-plans'))) {
      navigate('/account');
      return;
    }
    
    // Only redirect unauthenticated users from protected routes to auth
    if (!userLoading && !user && isUserRoute) {
      const timeoutId = setTimeout(() => {
        window.location.href = '/auth?returnTo=' + encodeURIComponent(location);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Admin redirects
    if (!adminLoading && !admin && isAdminRoute && location !== '/admin/login') {
      window.location.href = '/admin/login';
    }
  }, [user, admin, userProfile, userLoading, adminLoading, profileLoading, location, navigate]);
  
  // Show loading spinner for protected routes and when checking onboarding status
  if ((userLoading && (location.startsWith('/account') || location.startsWith('/checkout'))) ||
      (user && profileLoading && location.startsWith('/account')) ||
      (adminLoading && location.startsWith('/admin') && location !== '/admin/login')) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">
        <Layout>
          <Home />
        </Layout>
      </Route>
      <Route path="/meal-plans">
        <Layout>
          <MealPlans />
        </Layout>
      </Route>
      <Route path="/menu/:weekId">
        {(params) => (
          <Layout>
            <MenuSelection weekId={params.weekId} />
          </Layout>
        )}
      </Route>
      <Route path="/auth">
        <Layout>
          <AuthPage />
        </Layout>
      </Route>
      <Route path="/reset-password">
        <ResetPasswordPage />
      </Route>
      <Route path="/meals">
        <MealsPage />
      </Route>
      
      {/* User routes */}
      <Route path="/checkout">
        <Layout>
          <CheckoutPage />
        </Layout>
      </Route>
      <Route path="/account">
        <Layout>
          <AccountPage />
        </Layout>
      </Route>
      
      {/* Payment callback routes - support both singular and plural */}
      <Route path="/payment/response">
        <PaymentResponsePage />
      </Route>
      <Route path="/payments/response">
        <PaymentResponsePage />
      </Route>
      
      {/* Admin authentication */}
      <Route path="/admin/login">
        <AdminAuthPage />
      </Route>
      
      {/* Admin routes - more specific routes first */}
      <Route path="/admin/dashboard">
        <Layout>
          <AdminDashboard />
        </Layout>
      </Route>
      
      <Route path="/admin">
        <Layout>
          <AdminDashboard />
        </Layout>
      </Route>
      <Route path="/admin/menu">
        <Layout>
          <MenuManagement />
        </Layout>
      </Route>
      <Route path="/admin/orders">
        <Layout>
          <OrdersManagement />
        </Layout>
      </Route>
      
      {/* Fallback */}
      <Route>
        <Layout>
          <NotFound />
        </Layout>
      </Route>
    </Switch>
  );
}

export default App;
