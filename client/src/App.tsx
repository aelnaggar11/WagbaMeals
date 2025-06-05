import { Route, Switch } from "wouter";
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
  // Get current location for protected route handling
  const [location, setLocation] = useState(window.location.pathname);
  
  // Listen for location changes
  useEffect(() => {
    const handleRouteChange = () => {
      setLocation(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);
  
  // User authentication query
  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });

  // Admin authentication query
  const { data: admin, isLoading: adminLoading } = useQuery<Admin | null>({
    queryKey: ['/api/admin/auth/me'],
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
  
  // Handle auth redirects
  useEffect(() => {
    const isUserRoute = 
      location.startsWith('/account') || 
      location.startsWith('/checkout');
    const isAdminRoute = location.startsWith('/admin');
      
    if (!userLoading && !user && isUserRoute) {
      window.location.href = '/auth';
    }
    
    if (!adminLoading && !admin && isAdminRoute && location !== '/admin/login') {
      window.location.href = '/admin/login';
    }
  }, [user, admin, userLoading, adminLoading, location]);
  
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
      
      {/* Admin routes */}
      <Route path="/admin">
        {admin ? (
          <Layout>
            <AdminDashboard />
          </Layout>
        ) : (
          <Layout>
            <NotFound />
          </Layout>
        )}
      </Route>
      <Route path="/admin/dashboard">
        {admin ? (
          <Layout>
            <AdminDashboard />
          </Layout>
        ) : (
          <Layout>
            <NotFound />
          </Layout>
        )}
      </Route>
      <Route path="/admin/menu">
        {admin ? (
          <Layout>
            <MenuManagement />
          </Layout>
        ) : (
          <Layout>
            <NotFound />
          </Layout>
        )}
      </Route>
      <Route path="/admin/orders">
        {admin ? (
          <Layout>
            <OrdersManagement />
          </Layout>
        ) : (
          <Layout>
            <NotFound />
          </Layout>
        )}
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
