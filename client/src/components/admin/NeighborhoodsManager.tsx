import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Neighborhood } from "@shared/schema";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";

const NeighborhoodsManager = () => {
  const [newNeighborhood, setNewNeighborhood] = useState({ name: "", isServiced: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{ name: string; isServiced: boolean }>({ name: "", isServiced: false });
  const { toast } = useToast();

  // Fetch neighborhoods
  const { data: neighborhoodsData, isLoading } = useQuery<{ neighborhoods: Neighborhood[] }>({
    queryKey: ['/api/admin/neighborhoods'],
  });

  const neighborhoods = neighborhoodsData?.neighborhoods || [];

  // Create neighborhood mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; isServiced: boolean }) => {
      return await apiRequest('POST', '/api/admin/neighborhoods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/neighborhoods'] });
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
    mutationFn: async ({ id, data }: { id: number; data: { name: string; isServiced: boolean } }) => {
      return await apiRequest('PATCH', `/api/admin/neighborhoods/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/neighborhoods'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/neighborhoods'] });
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
    createMutation.mutate(newNeighborhood);
  };

  const handleEdit = (neighborhood: Neighborhood) => {
    setEditingId(neighborhood.id);
    setEditingData({ name: neighborhood.name, isServiced: neighborhood.isServiced });
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
    updateMutation.mutate({ id: editingId!, data: editingData });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ name: "", isServiced: false });
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Adding..." : "Add Neighborhood"}
              </Button>
            </div>
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
                  <div className="flex items-center gap-4 flex-1">
                    <Input
                      value={editingData.name}
                      onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                      className="max-w-xs"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingData.isServiced}
                        onCheckedChange={(checked) => setEditingData({ ...editingData, isServiced: checked })}
                      />
                      <span className="text-sm">{editingData.isServiced ? "Serviced" : "Not Serviced"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{neighborhood.name}</span>
                      <Badge variant={neighborhood.isServiced ? "default" : "secondary"}>
                        {neighborhood.isServiced ? "Serviced" : "Not Serviced"}
                      </Badge>
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