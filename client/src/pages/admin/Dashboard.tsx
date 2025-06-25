import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Admin } from "@shared/schema";
import { Button } from "@/components/ui/button";
import MenuManagement from "./MenuManagement";
import OrdersManagement from "./OrdersManagement";
import MealsManager from "@/components/admin/MealsManager";
import NeighborhoodsManager from "@/components/admin/NeighborhoodsManager";
import InvitationCodesManager from "@/components/admin/InvitationCodesManager";
import WaitlistManager from "@/components/admin/WaitlistManager";

const Dashboard = () => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("weekly-menus");

  // Force authentication refresh on component mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/auth/me'] });
  }, []);

  // Check if admin is authenticated with aggressive refresh settings
  const { data: admin, isLoading: adminLoading, error } = useQuery<Admin>({
    queryKey: ['/api/admin/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/admin/auth/me', { 
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Show loading state while checking authentication
  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show access denied only after loading completes and no admin found
  if (!admin && !adminLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
          <Button onClick={() => navigate('/admin/login')}>Admin Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your Wagba meal delivery service</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-gray-200 rounded-lg p-1">
            <TabsTrigger 
              value="weekly-menus" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary text-gray-600"
            >
              Weekly Menus
            </TabsTrigger>
            <TabsTrigger 
              value="meals" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary text-gray-600"
            >
              Meals
            </TabsTrigger>
            <TabsTrigger 
              value="pricing" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary text-gray-600"
            >
              Pricing
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary text-gray-600"
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary text-gray-600"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger 
              value="neighborhoods" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary text-gray-600"
            >
              Neighborhoods
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly-menus" className="mt-0">
            <MenuManagement />
          </TabsContent>

          <TabsContent value="meals" className="mt-0">
            <MealsManager />
          </TabsContent>

          <TabsContent value="pricing" className="mt-0">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">Pricing Management</h3>
              <p className="text-gray-600">Pricing management coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">User Management</h3>
              <p className="text-gray-600">User management coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            <OrdersManagement />
          </TabsContent>

          <TabsContent value="neighborhoods" className="mt-0">
            <NeighborhoodsManager />
          </TabsContent>

          <TabsContent value="invitation-codes" className="mt-0">
            <InvitationCodesManager />
          </TabsContent>

          <TabsContent value="waitlist" className="mt-0">
            <WaitlistManager />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">Analytics</h3>
              <p className="text-gray-600">Analytics dashboard coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;