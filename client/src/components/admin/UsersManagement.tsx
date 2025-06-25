import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@shared/schema";
import { Users, Mail, Phone, MapPin } from "lucide-react";

const UsersManagement = () => {
  // Fetch users
  const { data: usersData, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users'],
  });

  const users = usersData?.users || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Yet</h3>
        <p className="text-gray-600">No user accounts have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <h4 className="text-lg font-medium">User Accounts ({users.length})</h4>
        </div>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  ID: {user.id}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{user.phone}</span>
                  </div>
                )}
              </div>
              
              {user.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    {typeof user.address === 'string' ? (
                      <span>{user.address}</span>
                    ) : (
                      <div className="space-y-1">
                        <div>{user.address.street}, {user.address.building}</div>
                        {user.address.apartment && <div>Apt: {user.address.apartment}</div>}
                        <div>{user.address.area}</div>
                        {user.address.landmark && <div>Near: {user.address.landmark}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Username: {user.username}
                </span>
                <span className="text-xs text-gray-500">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UsersManagement;