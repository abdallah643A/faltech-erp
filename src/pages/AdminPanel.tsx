import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, Users as UsersIcon, UserCog, Loader2 } from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AppRole = 'admin' | 'manager' | 'sales_rep' | 'user';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  created_at: string;
  roles: AppRole[];
}

export default function AdminPanel() {
  const { direction } = useLanguage();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('user');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        department: profile.department,
        created_at: profile.created_at,
        roles: allRoles
          ?.filter(r => r.user_id === profile.user_id)
          .map(r => r.role as AppRole) || ['user'],
      }));

      return usersWithRoles;
    },
    enabled: hasRole('admin'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Then insert the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Role Updated',
        description: 'User role has been successfully updated.',
      });
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getRoleBadge = (role: AppRole) => {
    const variants: Record<AppRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      admin: 'destructive',
      manager: 'default',
      sales_rep: 'secondary',
      user: 'outline',
    };
    const labels: Record<AppRole, string> = {
      admin: 'Admin',
      manager: 'Manager',
      sales_rep: 'Sales Rep',
      user: 'User',
    };
    return <Badge variant={variants[role]}>{labels[role]}</Badge>;
  };

  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.roles.includes('admin')).length || 0,
    managers: users?.filter(u => u.roles.includes('manager')).length || 0,
    salesReps: users?.filter(u => u.roles.includes('sales_rep')).length || 0,
  };

  if (!hasRole('admin')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  const adminColumns: ColumnDef[] = [
    { key: 'email', header: 'Email' },
    { key: 'full_name', header: 'Full Name' },
    { key: 'department', header: 'Department' },
  ];

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filteredUsers} columns={adminColumns} filename="admin-users" title="Admin Users" />
          <SAPSyncButton entity="business_partner" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <UserCog className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Reps</CardTitle>
            <UsersIcon className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salesReps}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage user roles across the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.roles.map((role, idx) => (
                            <span key={idx}>{getRoleBadge(role)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.roles[0] || 'user');
                              }}
                            >
                              Change Role
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Update User Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Change the role for {user.full_name || user.email}. This will affect their access permissions across the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User - Basic access</SelectItem>
                                  <SelectItem value="sales_rep">Sales Rep - Can manage leads & orders</SelectItem>
                                  <SelectItem value="manager">Manager - Can manage team & reports</SelectItem>
                                  <SelectItem value="admin">Admin - Full system access</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (selectedUser) {
                                    updateRoleMutation.mutate({
                                      userId: selectedUser.user_id,
                                      role: newRole,
                                    });
                                  }
                                }}
                                disabled={updateRoleMutation.isPending}
                              >
                                {updateRoleMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Update Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
