import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Admin, User, Order, Week } from "@shared/schema";
import { Calendar, DollarSign, ShoppingBag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserList from "@/components/admin/UserList";
import OrderList from "@/components/admin/OrderList";

const COLORS = ['#A80906', '#25632d', '#6ac66b', '#ff9045', '#f2ecde'];

const Dashboard = () => {
  const [, navigate] = useLocation();
  
  // Check if admin is authenticated - must be before any conditional returns
  const { data: admin } = useQuery<Admin>({
    queryKey: ['/api/admin/auth/me'],
  });
  
  // Fetch data for dashboard - must be called unconditionally
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users'],
    enabled: !!admin,
  });
  
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
    enabled: !!admin,
  });
  
  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ['/api/admin/orders'],
    enabled: !!admin,
  });
  
  if (!admin) {
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
  
  // Active week for orders
  const [activeWeekId, setActiveWeekId] = useState<number | undefined>(
    weeksData?.weeks.find(week => week.isActive)?.id
  );
  
  // Update active week when weeks data is loaded
  useEffect(() => {
    if (weeksData?.weeks) {
      const currentWeek = weeksData.weeks.find(week => week.isActive);
      if (currentWeek) {
        setActiveWeekId(currentWeek.id);
      }
    }
  }, [weeksData]);
  
  // Prepare data for charts
  const weeklyOrdersData = ordersData?.orders
    ? Array.from(new Set(ordersData.orders.map(order => order.weekId)))
        .map(weekId => {
          const week = weeksData?.weeks.find(w => w.id === weekId);
          const weekOrders = ordersData.orders.filter(order => order.weekId === weekId);
          return {
            weekId,
            week: week?.label || `Week ${weekId}`,
            orders: weekOrders.length,
            revenue: weekOrders.reduce((sum, order) => sum + order.total, 0),
            averageOrder: weekOrders.length > 0 
              ? (weekOrders.reduce((sum, order) => sum + order.total, 0) / weekOrders.length).toFixed(0)
              : 0
          };
        })
    : [];
  
  // Meal counts by portion size
  const portionSizeData = [
    {
      name: "Standard",
      value: ordersData?.orders
        ? ordersData.orders.filter(order => order.defaultPortionSize === "standard").length
        : 0
    },
    {
      name: "Large",
      value: ordersData?.orders
        ? ordersData.orders.filter(order => order.defaultPortionSize === "large").length
        : 0
    },
    {
      name: "Mixed",
      value: ordersData?.orders
        ? ordersData.orders.filter(order => order.defaultPortionSize === "mixed").length
        : 0
    }
  ];
  
  // Meal counts by quantity
  const mealCountData = ordersData?.orders
    ? Array.from(new Set(ordersData.orders.map(order => order.mealCount)))
        .map(count => ({
          mealCount: count,
          orders: ordersData.orders.filter(order => order.mealCount === count).length
        }))
        .sort((a, b) => a.mealCount - b.mealCount)
    : [];
  
  // Calculate summary statistics
  const totalUsers = usersData?.users.length || 0;
  const totalOrders = ordersData?.orders.length || 0;
  const totalRevenue = ordersData?.orders
    ? ordersData.orders.reduce((sum, order) => sum + order.total, 0)
    : 0;
  const averageOrderValue = totalOrders > 0
    ? (totalRevenue / totalOrders).toFixed(0)
    : 0;
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your meals, orders, and customers</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/menu">
            <Button variant="outline">Manage Menu</Button>
          </Link>
          <Link href="/admin/orders">
            <Button variant="outline">Manage Orders</Button>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <h3 className="text-3xl font-bold">{totalUsers}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <h3 className="text-3xl font-bold">{totalOrders}</h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <h3 className="text-3xl font-bold">EGP {totalRevenue.toFixed(0)}</h3>
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
              <h3 className="text-3xl font-bold">EGP {averageOrderValue}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Orders</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weeklyOrdersData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#A80906" 
                  activeDot={{ r: 8 }} 
                  name="Orders" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Week</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyOrdersData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#25632d" name="Revenue (EGP)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Portion Size Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portionSizeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {portionSizeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Meal Count Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mealCountData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mealCount" label={{ value: 'Meals per Order', position: 'bottom' }} />
                <YAxis label={{ value: 'Number of Orders', angle: -90, position: 'left' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#ff9045" name="Number of Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Tables */}
      <Tabs defaultValue="orders" className="mt-12">
        <TabsList>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersData && <OrderList orders={ordersData.orders.slice(0, 10)} />}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {usersData && <UserList users={usersData.users} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
