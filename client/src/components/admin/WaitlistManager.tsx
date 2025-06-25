import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WaitlistEntry } from "@shared/schema";
import { Trash2, Mail, Users } from "lucide-react";

const WaitlistManager = () => {
  const { toast } = useToast();

  // Fetch waitlist entries
  const { data: waitlistData, isLoading } = useQuery<{ waitlistEntries: WaitlistEntry[] }>({
    queryKey: ['/api/admin/waitlist'],
  });

  const waitlistEntries = waitlistData?.waitlistEntries || [];

  // Delete waitlist entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/waitlist/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      toast({
        title: "Success",
        description: "Waitlist entry removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove waitlist entry.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this entry from the waitlist?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEmailCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Copied",
      description: "Email address copied to clipboard.",
    });
  };

  const exportWaitlist = () => {
    const csvContent = [
      ['Email', 'Neighborhood', 'Reason', 'Date'],
      ...waitlistEntries.map(entry => [
        entry.email,
        entry.neighborhood,
        entry.rejectionReason === 'invalid_code' ? 'Invalid Code' : 'Area Not Serviced',
        new Date(entry.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wagba-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Waitlist exported to CSV file.",
    });
  };

  const groupedByReason = waitlistEntries.reduce((acc, entry) => {
    const reason = entry.rejectionReason || 'unknown';
    if (!acc[reason]) acc[reason] = [];
    acc[reason].push(entry);
    return acc;
  }, {} as Record<string, WaitlistEntry[]>);

  const groupedByNeighborhood = waitlistEntries.reduce((acc, entry) => {
    const neighborhood = entry.neighborhood;
    if (!acc[neighborhood]) acc[neighborhood] = [];
    acc[neighborhood].push(entry);
    return acc;
  }, {} as Record<string, WaitlistEntry[]>);

  if (isLoading) {
    return <div>Loading waitlist...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Waitlist</p>
                <p className="text-2xl font-bold">{waitlistEntries.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Invalid Codes</p>
                <p className="text-2xl font-bold">{groupedByReason.invalid_code?.length || 0}</p>
              </div>
              <Mail className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unserviced Areas</p>
                <p className="text-2xl font-bold">{groupedByReason.area_not_serviced?.length || 0}</p>
              </div>
              <Mail className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={exportWaitlist} disabled={waitlistEntries.length === 0}>
          Export to CSV
        </Button>
      </div>

      {/* Waitlist Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Entries ({waitlistEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {waitlistEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{entry.email}</p>
                    <p className="text-sm text-gray-600">{entry.neighborhood}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={entry.rejectionReason === 'invalid_code' ? 'secondary' : 'destructive'}>
                    {entry.rejectionReason === 'invalid_code' ? 'Invalid Code' : 'Area Not Serviced'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEmailCopy(entry.email)}
                  >
                    Copy Email
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {waitlistEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No entries in the waitlist yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {waitlistEntries.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Popular Neighborhoods (Unserviced)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(groupedByNeighborhood)
                  .sort(([,a], [,b]) => b.length - a.length)
                  .slice(0, 10)
                  .map(([neighborhood, entries]) => (
                    <div key={neighborhood} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{neighborhood}</span>
                      <Badge variant="outline">{entries.length} people</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WaitlistManager;