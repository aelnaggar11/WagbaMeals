import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, forceRefreshQuery } from "@/lib/queryClient";
import { InvitationCode } from "@shared/schema";
import { Plus, Trash2, Edit, Save, X, Copy, Check } from "lucide-react";

const InvitationCodesManager = () => {
  const [newCode, setNewCode] = useState({ 
    code: "", 
    isActive: true, 
    maxUses: null as number | null, 
    description: "" 
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{ 
    code: string; 
    isActive: boolean; 
    maxUses: number | null; 
    description: string 
  }>({ code: "", isActive: true, maxUses: null, description: "" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch invitation codes
  const { data: codesData, isLoading, refetch } = useQuery<{ codes: InvitationCode[] }>({
    queryKey: ['/api/admin/invitation-codes'],
  });

  const codes = codesData?.codes || [];

  // Create code mutation
  const createMutation = useMutation({
    mutationFn: async (data: { code: string; isActive: boolean; maxUses: number | null; description: string }) => {
      return await apiRequest('POST', '/api/admin/invitation-codes', data);
    },
    onSuccess: (newCode) => {
      console.log('=== CREATE SUCCESS ===');
      console.log('New code response:', newCode);
      
      // Force immediate refetch to get fresh data
      refetch();
      
      setNewCode({ code: "", isActive: true, maxUses: null, description: "" });
      toast({
        title: "Success",
        description: "Invitation code created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invitation code.",
        variant: "destructive",
      });
    },
  });

  // Update code mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: { code: string; isActive: boolean; maxUses: number | null; description: string } 
    }) => {
      return await apiRequest('PATCH', `/api/admin/invitation-codes/${id}`, data);
    },
    onSuccess: (updatedCode) => {
      // Force immediate refetch to get fresh data
      refetch();
      
      setEditingId(null);
      toast({
        title: "Success",
        description: "Invitation code updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invitation code.",
        variant: "destructive",
      });
    },
  });

  // Delete code mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/invitation-codes/${id}`);
    },
    onSuccess: (_, deletedId) => {
      console.log('=== DELETE SUCCESS ===');
      console.log('Deleted ID:', deletedId);
      
      // Force immediate refetch to get fresh data
      refetch();
      
      toast({
        title: "Success",
        description: "Invitation code deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invitation code.",
        variant: "destructive",
      });
    },
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode({ ...newCode, code: result });
  };

  const handleCreate = () => {
    if (!newCode.code.trim()) {
      toast({
        title: "Error",
        description: "Code is required.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newCode);
  };

  const handleEdit = (code: InvitationCode) => {
    setEditingId(code.id);
    setEditingData({ 
      code: code.code, 
      isActive: code.isActive, 
      maxUses: code.maxUses, 
      description: code.description || "" 
    });
  };

  const handleSaveEdit = () => {
    if (!editingData.code.trim()) {
      toast({
        title: "Error",
        description: "Code is required.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: editingId!, data: editingData });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ code: "", isActive: true, maxUses: null, description: "" });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this invitation code?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copied",
        description: "Invitation code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading invitation codes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Invitation Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="WAGBA2025"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generateRandomCode}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (leave empty for unlimited)</Label>
              <Input
                id="maxUses"
                type="number"
                value={newCode.maxUses || ""}
                onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={newCode.description}
              onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
              placeholder="Launch week invitations"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={newCode.isActive}
                onCheckedChange={(checked) => setNewCode({ ...newCode, isActive: checked })}
              />
              <span className="text-sm">Active</span>
            </div>
            <Button 
              onClick={handleCreate} 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes List */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation Codes ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {codes.map((code) => (
              <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg">
                {editingId === code.id ? (
                  <div className="flex items-center gap-4 flex-1">
                    <Input
                      value={editingData.code}
                      onChange={(e) => setEditingData({ ...editingData, code: e.target.value.toUpperCase() })}
                      className="max-w-32"
                    />
                    <Input
                      type="number"
                      value={editingData.maxUses || ""}
                      onChange={(e) => setEditingData({ ...editingData, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Max uses"
                      className="max-w-24"
                    />
                    <Input
                      value={editingData.description}
                      onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                      placeholder="Description"
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingData.isActive}
                        onCheckedChange={(checked) => setEditingData({ ...editingData, isActive: checked })}
                      />
                      <span className="text-sm">Active</span>
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
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm font-bold">
                          {code.code}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(code.code)}
                          className="p-1"
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={code.isActive ? "default" : "secondary"}>
                          {code.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {code.currentUses}/{code.maxUses || "∞"} uses
                        </span>
                      </div>
                      {code.description && (
                        <span className="text-sm text-gray-500">{code.description}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(code)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(code.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {codes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No invitation codes created yet. Create your first code above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationCodesManager;