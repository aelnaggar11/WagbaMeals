import { Route, Switch } from "wouter";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import MealPlans from "@/pages/MealPlans";
import MenuSelection from "@/pages/MenuSelection";
import CheckoutPage from "@/pages/CheckoutPage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/Dashboard";
import MenuManagement from "@/pages/admin/MenuManagement";
import OrdersManagement from "@/pages/admin/OrdersManagement";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

function App() {
  const { data: user } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const isAdmin = user?.isAdmin;

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
      
      {/* Admin routes */}
      <Route path="/admin">
        {isAdmin ? (
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
        {isAdmin ? (
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
        {isAdmin ? (
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
