import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Building2, UserPlus, Trash2, Edit } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type AppRole = 'admin' | 'partner' | 'manager' | 'analyst' | 'client_user';

interface UserWithRole {
  user_id: string;
  email: string;
  role: AppRole;
  created_at: string;
}

interface ClientAssignment {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  assigned_at: string;
}

export default function SecurityAccess() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, isAdmin } = useUserRole();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('analyst');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  const [selectedAssignmentUserId, setSelectedAssignmentUserId] = useState<string | null>(null);
  const [selectedAssignmentEngagementId, setSelectedAssignmentEngagementId] = useState<string | null>(null);

  // Fetch profiles for email lookup
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const getEmailForUser = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.email || userId.slice(0, 8) + '...';
  };

  const getNameForUser = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || null;
  };

  // Fetch users with roles
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserWithRole[];
    },
    enabled: isAdmin,
  });

  // Fetch all clients for assignment dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch client assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['client-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_assignments')
        .select(`
          id,
          user_id,
          client_id,
          assigned_at,
          clients (name)
        `)
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;
      return data.map((a: any) => ({
        ...a,
        client_name: a.clients?.name || 'Unknown',
      }));
    },
    enabled: isAdmin,
  });

  // Fetch all engagements for module assignment scoping
  const { data: engagements = [] } = useQuery({
    queryKey: ['admin-engagements-with-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagements')
        .select('id, name, client_id, clients(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        client_name: e.clients?.name || 'Unknown',
      }));
    },
    enabled: isAdmin,
  });

  // Fetch existing module assignments for selected user/engagement
  const { data: userModuleAssignments = [], refetch: refetchModuleAssignments } = useQuery({
    queryKey: ['admin-module-assignments', selectedAssignmentUserId, selectedAssignmentEngagementId],
    queryFn: async () => {
      if (!selectedAssignmentUserId || !selectedAssignmentEngagementId) return [];
      const { data, error } = await supabase
        .from('engagement_module_assignments')
        .select('module')
        .eq('user_id', selectedAssignmentUserId)
        .eq('engagement_id', selectedAssignmentEngagementId);
      if (error) throw error;
      return (data ?? []).map((d: any) => d.module) as string[];
    },
    enabled: !!selectedAssignmentUserId && !!selectedAssignmentEngagementId && isAdmin,
  });

  // Add user role mutation — looks up user by email first
  const addUserRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // Look up user_id from profiles by email
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!profile) throw new Error(`No account found for "${email}". The user must sign up first.`);

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User role added successfully' });
      setIsAddUserOpen(false);
      setNewUserEmail('');
      setNewUserRole('analyst');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add user role', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User role updated successfully' });
    },
  });

  // Delete user role mutation
  const deleteUserRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User role removed' });
    },
  });

  // Assign client mutation
  const assignClientMutation = useMutation({
    mutationFn: async ({ userId, clientId }: { userId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_assignments')
        .insert({ user_id: userId, client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-assignments'] });
      toast({ title: 'Client assigned successfully' });
      setSelectedUserId(null);
      setSelectedClientId('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to assign client', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('client_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-assignments'] });
      toast({ title: 'Assignment removed' });
    },
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'partner': return 'default';
      case 'manager': return 'secondary';
      case 'analyst': return 'outline';
      default: return 'outline';
    }
  };

  const formatRole = (role: AppRole) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access security settings. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Security & Access</h1>
        <p className="text-muted-foreground">
          Manage user roles and client assignments
        </p>
      </div>

      {/* User Roles Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Roles
            </CardTitle>
            <CardDescription>
              Manage user access levels and permissions
            </CardDescription>
          </div>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User Role</DialogTitle>
                <DialogDescription>
                  Assign a role to a user. The user must already have an account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="Enter user email address"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user must have signed up and verified their email first.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="client_user">Client User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => addUserRoleMutation.mutate({ 
                    email: newUserEmail, 
                    role: newUserRole 
                  })}
                  disabled={!newUserEmail || addUserRoleMutation.isPending}
                  className="w-full"
                >
                  {addUserRoleMutation.isPending ? 'Adding...' : 'Add Role'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No user roles configured yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getEmailForUser(user.user_id)}</div>
                        {getNameForUser(user.user_id) && (
                          <div className="text-xs text-muted-foreground">{getNameForUser(user.user_id)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Select 
                          value={user.role}
                          onValueChange={(v) => updateUserRoleMutation.mutate({ 
                            userId: user.user_id, 
                            role: v as AppRole 
                          })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <Edit className="w-3 h-3 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="client_user">Client User</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteUserRoleMutation.mutate(user.user_id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Client Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Client Assignments
          </CardTitle>
          <CardDescription>
            Assign users to clients to grant them access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assignment Form */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {getEmailForUser(user.user_id)} ({formatRole(user.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  if (selectedUserId && selectedClientId) {
                    assignClientMutation.mutate({ 
                      userId: selectedUserId, 
                      clientId: selectedClientId 
                    });
                  }
                }}
                disabled={!selectedUserId || !selectedClientId || assignClientMutation.isPending}
              >
                Assign
              </Button>
            </div>
          </div>

          {/* Assignments Table */}
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No client assignments yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="font-medium">{getEmailForUser(assignment.user_id)}</div>
                    </TableCell>
                    <TableCell>{assignment.client_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Module Scoping Assignments Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Analyst Module Scoping
          </CardTitle>
          <CardDescription>
            Optionally restrict an analyst's access to specific modules on an engagement (opt-in scoping)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Engagement</Label>
              <Select 
                value={selectedAssignmentEngagementId || ''} 
                onValueChange={setSelectedAssignmentEngagementId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client engagement" />
                </SelectTrigger>
                <SelectContent>
                  {engagements.map((eng) => (
                    <SelectItem key={eng.id} value={eng.id}>
                      {eng.client_name} - {eng.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Analyst / User</Label>
              <Select 
                value={selectedAssignmentUserId || ''} 
                onValueChange={setSelectedAssignmentUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {getEmailForUser(u.user_id)} ({formatRole(u.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAssignmentUserId && selectedAssignmentEngagementId ? (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div>
                <h3 className="font-semibold text-sm">Select Assigned Modules</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Leaving all modules unchecked grants access to all modules (opt-in scoping). Checking at least one module restricts the analyst to only the checked modules.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {[
                  { key: 'msb_registration', label: 'MSB Registration' },
                  { key: 'governance', label: 'Governance' },
                  { key: 'aml_program', label: 'AML Program - Policies & Procedures' },
                  { key: 'risk_assessment', label: 'AML Program - Risk Assessment' },
                  { key: 'training', label: 'AML Program - Training' },
                  { key: 'effectiveness', label: 'AML Program - Effectiveness' },
                  { key: 'kyc', label: 'KYC Review' },
                  { key: 'reporting', label: 'Transaction Reporting' },
                  { key: 'monitoring', label: 'Transaction Monitoring' },
                ].map((mod) => {
                  const isChecked = userModuleAssignments.includes(mod.key);
                  const toggleMutation = useMutation({
                    mutationFn: async ({ checked }: { checked: boolean }) => {
                      if (checked) {
                        const { error } = await supabase
                          .from('engagement_module_assignments')
                          .insert({
                            user_id: selectedAssignmentUserId,
                            engagement_id: selectedAssignmentEngagementId,
                            module: mod.key,
                          });
                        if (error) throw error;
                      } else {
                        const { error } = await supabase
                          .from('engagement_module_assignments')
                          .delete()
                          .eq('user_id', selectedAssignmentUserId)
                          .eq('engagement_id', selectedAssignmentEngagementId)
                          .eq('module', mod.key);
                        if (error) throw error;
                      }
                    },
                    onSuccess: () => {
                      refetchModuleAssignments();
                      toast({ title: `${mod.label} assignment updated` });
                    },
                    onError: (err: any) => {
                      toast({
                        title: 'Failed to update assignment',
                        description: err.message,
                        variant: 'destructive',
                      });
                    },
                  });

                  return (
                    <div key={mod.key} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                      <Checkbox
                        id={`mod-${mod.key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          toggleMutation.mutate({ checked: !!checked });
                        }}
                        disabled={toggleMutation.isPending}
                      />
                      <Label 
                        htmlFor={`mod-${mod.key}`} 
                        className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
                      >
                        {mod.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/20 border border-dashed rounded-lg">
              Please select an engagement and user to configure module assignments.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
