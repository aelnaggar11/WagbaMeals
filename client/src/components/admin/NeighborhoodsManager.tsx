import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Neighborhood } from "@shared/schema";
import { Plus, Trash2, Edit, Save, X, Sunrise, Sunset, Clock } from "lucide-react";

const NeighborhoodsManager = () => {
  const [newNeighborhood, setNewNeighborhood] = useState({ 
    name: "", 
    isServiced: false,
    availableDeliverySlots: ['morning', 'evening'],
    preferredDeliverySlot: 'morning'
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{ 
    name: string; 
    isServiced: boolean;
    availableDeliverySlots: string[];
    preferredDeliverySlot: string;
  }>({ 
    name: "", 
    isServiced: false,
    availableDeliverySlots: ['morning', 'evening'],
    preferredDeliverySlot: 'morning'
  });
  const { toast } = useToast();

  // Fetch neighborhoods
  const { data: neighborhoodsData, isLoading, refetch } = useQuery<{ neighborhoods: Neighborhood[] }>({
    queryKey: ['/api/admin/neighborhoods'],
  });

  const neighborhoods = neighborhoodsData?.neighborhoods || [];

  // Create neighborhood mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; isServiced: boolean }) => {
      return await apiRequest('POST', '/api/admin/neighborhoods', data);
    },
    onSuccess: () => {
      refetch();
      setNewNeighborhood({ name: "", isServiced: false });
      toast({
        title: "Success",
        description: "Neighborhood created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create neighborhood.",
        variant: "destructive",
      });
    },
  });

  // Update neighborhood mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; isServiced: boolean; availableDeliverySlots: string[]; preferredDeliverySlot: string } }) => {
      return await apiRequest('PATCH', `/api/admin/neighborhoods/${id}`, data);
    },
    onSuccess: () => {
      refetch();
      setEditingId(null);
      toast({
        title: "Success",
        description: "Neighborhood updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update neighborhood.",
        variant: "destructive",
      });
    },
  });

  // Delete neighborhood mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/neighborhoods/${id}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Neighborhood deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete neighborhood.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newNeighborhood.name.trim()) {
      toast({
        title: "Error",
        description: "Neighborhood name is required.",
        variant: "destructive",
      });
      return;
    }
    if (newNeighborhood.availableDeliverySlots.length === 0) {
      toast({
        title: "Error",
        description: "At least one delivery slot must be available.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newNeighborhood);
  };

  const handleEdit = (neighborhood: Neighborhood) => {
    setEditingId(neighborhood.id);
    setEditingData({ 
      name: neighborhood.name, 
      isServiced: neighborhood.isServiced,
      availableDeliverySlots: neighborhood.availableDeliverySlots || ['morning', 'evening'],
      preferredDeliverySlot: neighborhood.preferredDeliverySlot || 'morning'
    });
  };

  const handleSaveEdit = () => {
    if (!editingData.name.trim()) {
      toast({
        title: "Error",
        description: "Neighborhood name is required.",
        variant: "destructive",
      });
      return;
    }
    if (editingData.availableDeliverySlots.length === 0) {
      toast({
        title: "Error",
        description: "At least one delivery slot must be available.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: editingId!, data: editingData });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ 
      name: "", 
      isServiced: false,
      availableDeliverySlots: ['morning', 'evening'],
      preferredDeliverySlot: 'morning'
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this neighborhood?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Loading neighborhoods...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Neighborhood */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Neighborhood
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Neighborhood Name</Label>
              <Input
                id="name"
                value={newNeighborhood.name}
                onChange={(e) => setNewNeighborhood({ ...newNeighborhood, name: e.target.value })}
                placeholder="e.g., Zamalek"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviced">Currently Serviced</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="serviced"
                  checked={newNeighborhood.isServiced}
                  onCheckedChange={(checked) => setNewNeighborhood({ ...newNeighborhood, isServiced: checked })}
                />
                <span className="text-sm">{newNeighborhood.isServiced ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          {/* Delivery Slot Configuration */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <Label className="text-base font-semibold">Delivery Slot Configuration</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Available Delivery Slots</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="morning-new"
                      checked={newNeighborhood.availableDeliverySlots.includes('morning')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewNeighborhood({
                            ...newNeighborhood,
                            availableDeliverySlots: [...new Set([...newNeighborhood.availableDeliverySlots, 'morning'])]
                          });
                        } else {
                          setNewNeighborhood({
                            ...newNeighborhood,
                            availableDeliverySlots: newNeighborhood.availableDeliverySlots.filter(slot => slot !== 'morning')
                          });
                        }
                      }}
                    />
                    <Sunrise className="h-4 w-4 text-orange-500" />
                    <Label htmlFor="morning-new">Morning (8 AM - 12 PM)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="evening-new"
                      checked={newNeighborhood.availableDeliverySlots.includes('evening')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewNeighborhood({
                            ...newNeighborhood,
                            availableDeliverySlots: [...new Set([...newNeighborhood.availableDeliverySlots, 'evening'])]
                          });
                        } else {
                          setNewNeighborhood({
                            ...newNeighborhood,
                            availableDeliverySlots: newNeighborhood.availableDeliverySlots.filter(slot => slot !== 'evening')
                          });
                        }
                      }}
                    />
                    <Sunset className="h-4 w-4 text-purple-500" />
                    <Label htmlFor="evening-new">Evening (6 PM - 10 PM)</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred-slot-new">Preferred Default Slot</Label>
                <Select
                  value={newNeighborhood.preferredDeliverySlot}
                  onValueChange={(value) => setNewNeighborhood({ ...newNeighborhood, preferredDeliverySlot: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleCreate} 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Neighborhood"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Neighborhoods List */}
      <Card>
        <CardHeader>
          <CardTitle>Neighborhoods ({neighborhoods.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {neighborhoods.map((neighborhood) => (
              <div key={neighborhood.id} className="flex items-center justify-between p-3 border rounded-lg">
                {editingId === neighborhood.id ? (
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex items-center gap-4">
                      <Input
                        value={editingData.name}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                        className="max-w-xs"
                        placeholder="Neighborhood name"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingData.isServiced}
                          onCheckedChange={(checked) => setEditingData({ ...editingData, isServiced: checked })}
                        />
                        <span className="text-sm">{editingData.isServiced ? "Serviced" : "Not Serviced"}</span>
                      </div>
                    </div>
                    
                    {/* Delivery Slot Editing */}
                    <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Delivery Slots</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Available Slots</Label>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editingData.availableDeliverySlots.includes('morning')}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingData({
                                      ...editingData,
                                      availableDeliverySlots: [...new Set([...editingData.availableDeliverySlots, 'morning'])]
                                    });
                                  } else {
                                    setEditingData({
                                      ...editingData,
                                      availableDeliverySlots: editingData.availableDeliverySlots.filter(slot => slot !== 'morning')
                                    });
                                  }
                                }}
                              />
                              <Sunrise className="h-3 w-3 text-orange-500" />
                              <span className="text-xs">Morning</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editingData.availableDeliverySlots.includes('evening')}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingData({
                                      ...editingData,
                                      availableDeliverySlots: [...new Set([...editingData.availableDeliverySlots, 'evening'])]
                                    });
                                  } else {
                                    setEditingData({
                                      ...editingData,
                                      availableDeliverySlots: editingData.availableDeliverySlots.filter(slot => slot !== 'evening')
                                    });
                                  }
                                }}
                              />
                              <Sunset className="h-3 w-3 text-purple-500" />
                              <span className="text-xs">Evening</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Default Slot</Label>
                          <Select
                            value={editingData.preferredDeliverySlot}
                            onValueChange={(value) => setEditingData({ ...editingData, preferredDeliverySlot: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="morning">Morning</SelectItem>
                              <SelectItem value="evening">Evening</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{neighborhood.name}</span>
                        <Badge variant={neighborhood.isServiced ? "default" : "secondary"}>
                          {neighborhood.isServiced ? "Serviced" : "Not Serviced"}
                        </Badge>
                      </div>
                      
                      {/* Delivery Slot Display */}
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Available:</span>
                        </div>
                        <div className="flex gap-2">
                          {(neighborhood.availableDeliverySlots || ['morning', 'evening']).map(slot => (
                            <div key={slot} className="flex items-center gap-1">
                              {slot === 'morning' ? (
                                <Sunrise className="h-3 w-3 text-orange-500" />
                              ) : (
                                <Sunset className="h-3 w-3 text-purple-500" />
                              )}
                              <span className="text-xs capitalize">{slot}</span>
                              {(neighborhood.preferredDeliverySlot || 'morning') === slot && (
                                <span className="text-xs text-blue-600 font-medium">(default)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(neighborhood)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(neighborhood.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {neighborhoods.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No neighborhoods added yet. Add your first neighborhood above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NeighborhoodsManager;