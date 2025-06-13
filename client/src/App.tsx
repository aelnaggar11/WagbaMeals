import { Route, Switch, useLocation } from "wouter";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import MealPlans from "@/pages/MealPlans";
import MenuSelection from "@/pages/MenuSelection";
import CheckoutPage from "@/pages/CheckoutPage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/AuthPage";
import AdminAuthPage from "@/pages/AdminAuthPage";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/Dashboard";
import MenuManagement from "@/pages/admin/MenuManagement";
import OrdersManagement from "@/pages/admin/OrdersManagement";
import { useQuery } from "@tanstack/react-query";
import { User, Admin } from "@shared/schema";
import { Loader2 } from "lucide-react";

function App() {
  // Use wouter's location hook instead of manual tracking
  const [location, navigate] = useLocation();
  
  // User authentication query with proper 401 handling
  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });

  // Admin authentication query with proper 401 handling
  const { data: admin, isLoading: adminLoading } = useQuery<Admin | null>({
    queryKey: ['/api/admin/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/admin/auth/me', { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
  
  // Handle auth redirects for admin routes only (user routes handled by components)
  useEffect(() => {
    const isAdminRoute = location.startsWith('/admin');
      
    if (!adminLoading && !admin && isAdminRoute && location !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [admin, adminLoading, location, navigate]);
  
  // Show loading spinner for protected routes
  if ((userLoading && (location.startsWith('/account') || location.startsWith('/checkout'))) ||
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
