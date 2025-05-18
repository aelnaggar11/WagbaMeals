import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from "@shared/schema";
import { MoreHorizontal, Mail, Phone, MapPin, User as UserIcon, Shield, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserListProps {
  users: User[];
}

const UserList = ({ users }: UserListProps) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };
  
  if (users.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No users found</p>
      </div>
    );
  }
  
  // Parse address from string if available
  const parseAddress = (addressStr?: string) => {
    if (!addressStr) return null;
    
    try {
      return JSON.parse(addressStr);
    } catch (e) {
      return { full: addressStr };
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">#{user.id}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.name || "-"}</TableCell>
              <TableCell>
                <a 
                  href={`mailto:${user.email}`} 
                  className="flex items-center text-blue-600 hover:underline"
                >
                  <Mail size={14} className="mr-1" />
                  {user.email}
                </a>
              </TableCell>
              <TableCell>
                {user.isAdmin ? (
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                    Admin
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                    Customer
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {user.createdAt ? formatDate(user.createdAt) : "-"}
              </TableCell>
              <TableCell className="text-right">
                <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) setSelectedUser(null);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleViewUser(user)}>
                      <MoreHorizontal size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    
                    {selectedUser && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{selectedUser.name || selectedUser.username}</h3>
                            <p className="text-gray-500 text-sm flex items-center">
                              {selectedUser.isAdmin ? (
                                <>
                                  <Shield size={14} className="mr-1 text-purple-500" />
                                  Administrator
                                </>
                              ) : (
                                <>
                                  <UserIcon size={14} className="mr-1" />
                                  Regular User
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <UserIcon size={16} className="mr-2 mt-0.5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">Username</p>
                              <p className="text-sm text-gray-600">{selectedUser.username}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <Mail size={16} className="mr-2 mt-0.5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">Email</p>
                              <p className="text-sm text-gray-600">{selectedUser.email}</p>
                            </div>
                          </div>
                          
                          {selectedUser.phone && (
                            <div className="flex items-start">
                              <Phone size={16} className="mr-2 mt-0.5 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p className="text-sm text-gray-600">{selectedUser.phone}</p>
                              </div>
                            </div>
                          )}
                          
                          {selectedUser.address && (
                            <div className="flex items-start">
                              <MapPin size={16} className="mr-2 mt-0.5 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Address</p>
                                <div className="text-sm text-gray-600">
                                  {(() => {
                                    const address = parseAddress(selectedUser.address);
                                    if (!address) return <p>No address provided</p>;
                                    
                                    if (address.full) return <p>{address.full}</p>;
                                    
                                    return (
                                      <div>
                                        <p>
                                          {address.building} {address.street}
                                          {address.apartment && `, Apt ${address.apartment}`}
                                        </p>
                                        <p>{address.area}</p>
                                        {address.landmark && <p>Landmark: {address.landmark}</p>}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start">
                            <Calendar size={16} className="mr-2 mt-0.5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">Joined</p>
                              <p className="text-sm text-gray-600">
                                {selectedUser.createdAt ? formatDate(selectedUser.createdAt) : "Unknown"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserList;
