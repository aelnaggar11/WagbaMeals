import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PricingConfig } from "@shared/schema";
import { PricingService, PricingCache } from "@/lib/pricingService";
import { Plus, Edit, Save, X, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PricingManager = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{ price: number; description: string }>({ price: 0, description: "" });
  const { toast } = useToast();

  // Fetch pricing configurations
  const { data: pricingData, isLoading, refetch } = useQuery<{ pricingConfigs: PricingConfig[] }>({
    queryKey: ['/api/admin/pricing'],
  });

  const pricingConfigs = pricingData?.pricingConfigs || [];

  // Group pricing by type for better organization
  const mealBundlePricing = pricingConfigs.filter(config => config.configType === 'meal_bundle');
  const deliveryPricing = pricingConfigs.filter(config => config.configType === 'delivery');
  const mealAddonPricing = pricingConfigs.filter(config => config.configType === 'meal_addon');

  // Update pricing mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { price: number; description: string } }) => {
      return await apiRequest('PATCH', `/api/admin/pricing/${id}`, data);
    },
    onSuccess: () => {
      // Clear pricing cache to force refresh
      PricingService.clearCache();
      
      // Invalidate all relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['/api/pricing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
      
      refetch();
      setEditingId(null);
      toast({
        title: "Success",
        description: "Pricing updated successfully. Changes will be reflected across the app immediately.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pricing.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (config: PricingConfig) => {
    setEditingId(config.id);
    setEditingData({
      price: config.price,
      description: config.description || ""
    });
  };

  const handleSave = (id: number) => {
    if (editingData.price < 0) {
      toast({
        title: "Error",
        description: "Price cannot be negative.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id, data: editingData });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({ price: 0, description: "" });
  };

  const formatConfigKey = (configKey: string) => {
    // Convert config key to readable format
    if (configKey.includes('_meals')) {
      const count = configKey.replace('_meals', '');
      return `${count} Meals`;
    }
    return configKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading pricing configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Pricing Management</h3>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Meal Bundle Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Meal Bundle Pricing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mealBundlePricing.length === 0 ? (
              <p className="text-gray-500 text-sm">No meal bundle pricing configured</p>
            ) : (
              mealBundlePricing.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formatConfigKey(config.configKey)}</span>
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {editingId === config.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="space-y-1">
                          <Label htmlFor={`price-${config.id}`} className="text-xs">Price (EGP)</Label>
                          <Input
                            id={`price-${config.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={editingData.price}
                            onChange={(e) => setEditingData(prev => ({ 
                              ...prev, 
                              price: parseFloat(e.target.value) || 0 
                            }))}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(config.id)}
                            disabled={updateMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-primary">
                          {formatCurrency(config.price)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Delivery Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Delivery Pricing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryPricing.length === 0 ? (
              <p className="text-gray-500 text-sm">No delivery pricing configured</p>
            ) : (
              deliveryPricing.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formatConfigKey(config.configKey)}</span>
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {editingId === config.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="space-y-1">
                          <Label htmlFor={`price-${config.id}`} className="text-xs">Price (EGP)</Label>
                          <Input
                            id={`price-${config.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={editingData.price}
                            onChange={(e) => setEditingData(prev => ({ 
                              ...prev, 
                              price: parseFloat(e.target.value) || 0 
                            }))}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(config.id)}
                            disabled={updateMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-primary">
                          {formatCurrency(config.price)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Meal Add-on Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Meal Add-ons</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mealAddonPricing.length === 0 ? (
              <p className="text-gray-500 text-sm">No meal add-on pricing configured</p>
            ) : (
              mealAddonPricing.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formatConfigKey(config.configKey)}</span>
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {editingId === config.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="space-y-1">
                          <Label htmlFor={`price-${config.id}`} className="text-xs">Price (EGP)</Label>
                          <Input
                            id={`price-${config.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={editingData.price}
                            onChange={(e) => setEditingData(prev => ({ 
                              ...prev, 
                              price: parseFloat(e.target.value) || 0 
                            }))}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(config.id)}
                            disabled={updateMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-primary">
                          {formatCurrency(config.price)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Pricing changes take effect immediately across the entire application</p>
          <p>• New users will see updated prices during onboarding</p>
          <p>• Existing users will see updated prices for new orders</p>
          <p>• Price changes are cached for 5 minutes to improve performance</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingManager;