import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Building2, UserPlus, Trash2, Edit, Plus, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateClientDialog } from '@/components/dialogs/CreateClientDialog';
import { CreateEngagementDialog } from '@/components/dialogs/CreateEngagementDialog';

type AppRole = 'admin' | 'partner' | 'manager' | 'analyst' | 'client_user';

interface UserWithRole {
  user_id: string;
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
  const { selectedClient, user, refreshClients, refreshEngagements } = useApp();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('analyst');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  const [selectedAssignmentUserId, setSelectedAssignmentUserId] = useState<string | null>(null);
  const [selectedAssignmentEngagementId, setSelectedAssignmentEngagementId] = useState<string | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showEngagementDialog, setShowEngagementDialog] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  const [engagementToEdit, setEngagementToEdit] = useState<any>(null);
  const [tempSelectedModules, setTempSelectedModules] = useState<string[]>([]);
  const [isCreateClientAccountOpen, setIsCreateClientAccountOpen] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientFullName, setNewClientFullName] = useState('');
  const [showNewClientPassword, setShowNewClientPassword] = useState(false);

  const createClientAccountMutation = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      // 1. Create user via Database RPC (securely inside the database)
      const { data, error: createError } = await supabase.rpc('admin_create_user', {
        _email: email.trim().toLowerCase(),
        _password: password,
        _full_name: fullName.trim(),
      });
      
      if (createError) {
        throw new Error(createError.message || "Failed to create user account.");
      }
      if (data?.success === false) {
        throw new Error(data.error || "Failed to create user account.");
      }

      // 2. Send credentials email via secure Database RPC
      let emailSent = false;
      let emailErrorMsg = '';

      try {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1E3A8A; margin-bottom: 4px;">Veritas Compliance Platform</h2>
            <p style="color: #64748B; font-size: 14px; margin-top: 0; margin-bottom: 24px;">Secure AML Auditing & Review</p>
            
            <p>Hello <strong>${fullName.trim()}</strong>,</p>
            <p>An administrator has created a client user account for you. You can log in using the temporary credentials below:</p>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Login Email:</strong> <span style="font-family: monospace;">${email.trim().toLowerCase()}</span></p>
              <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace;">${password}</span></p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <p>For your security, you will be prompted to change this temporary password and complete your profile setup (including uploading an optional profile picture) upon your first login.</p>
            
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0;">
              This is an automated onboarding notification. Please contact your Veritas compliance administrator if you did not request this account.
            </p>
          </div>
        `;

        const { data: emailData, error: emailError } = await supabase.rpc('send_resend_email_secure', {
          to_email: email.trim().toLowerCase(),
          subject: "Welcome to Veritas AML Platform - Your Credentials",
          html_content: emailHtml,
        });

        if (emailError) throw emailError;
        if (emailData?.success === false) {
          throw new Error(emailData.error || "Email delivery failed.");
        }
        emailSent = true;
      } catch (err: any) {
        console.error("Failed to send onboarding email:", err);
        emailErrorMsg = err.message || "Failed to call send_resend_email_secure RPC.";
      }
      
      return { email, password, emailSent, emailErrorMsg };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['client-assignments'] });
      
      if (data.emailSent) {
        toast({ 
          title: 'Client account created', 
          description: `Account for ${data.email} has been created. An onboarding email containing the login credentials has been sent.` 
        });
      } else {
        toast({ 
          title: 'Account created with warning', 
          description: `Account for ${data.email} has been created, but the credentials email could not be sent: ${data.emailErrorMsg}. Please provide the password manually: ${data.password}`,
          variant: 'destructive',
        });
      }
      
      setIsCreateClientAccountOpen(false);
      setNewClientEmail('');
      setNewClientPassword('');
      setNewClientFullName('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create client account', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleClientOpenChange = (open: boolean) => {
    setShowClientDialog(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      setClientToEdit(null);
    }
  };

  const handleEngagementOpenChange = (open: boolean) => {
    setShowEngagementDialog(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['admin-engagements-with-clients'] });
      setEngagementToEdit(null);
    }
  };

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-engagements-with-clients'] });
      refreshClients();
      toast({ title: 'Client deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete client',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete engagement mutation
  const deleteEngagementMutation = useMutation({
    mutationFn: async (engagementId: string) => {
      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', engagementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-engagements-with-clients'] });
      refreshEngagements();
      toast({ title: 'Engagement deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete engagement',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'client' | 'engagement' } | null>(null);

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
    if (!userId) return 'Unknown User';
    const profile = profiles.find(p => p.id === userId);
    return profile?.email || (typeof userId === 'string' ? userId.slice(0, 8) + '...' : 'Unknown');
  };

  const getNameForUser = (userId: string) => {
    if (!userId) return null;
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
        .select('id, name, entity_type')
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
        .select('id, name, client_id, status, clients(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        status: e.status,
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

  // Fetch if the selected user is assigned to the selected engagement
  const { data: isUserAssignedToEngagement, refetch: refetchEngagementAssignment } = useQuery({
    queryKey: ['engagement-assignment-check', selectedAssignmentUserId, selectedAssignmentEngagementId],
    queryFn: async () => {
      if (!selectedAssignmentUserId || !selectedAssignmentEngagementId) return false;
      const { data, error } = await supabase
        .from('engagement_assignments')
        .select('id')
        .eq('user_id', selectedAssignmentUserId)
        .eq('engagement_id', selectedAssignmentEngagementId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!selectedAssignmentUserId && !!selectedAssignmentEngagementId && isAdmin,
  });

  useEffect(() => {
    if (userModuleAssignments) {
      setTempSelectedModules(userModuleAssignments);
    } else {
      setTempSelectedModules([]);
    }
  }, [userModuleAssignments, selectedAssignmentUserId, selectedAssignmentEngagementId]);

  // Save module scoping assignments mutation
  const saveModuleScopingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignmentUserId || !selectedAssignmentEngagementId) return;

      // 1. Delete all existing module assignments for this user and engagement
      const { error: deleteError } = await supabase
        .from('engagement_module_assignments')
        .delete()
        .eq('user_id', selectedAssignmentUserId)
        .eq('engagement_id', selectedAssignmentEngagementId);
      
      if (deleteError) throw deleteError;

      // 2. Insert new selections
      if (tempSelectedModules.length > 0) {
        const insertData = tempSelectedModules.map((moduleKey) => ({
          user_id: selectedAssignmentUserId,
          engagement_id: selectedAssignmentEngagementId,
          module: moduleKey,
        }));

        const { error: insertError } = await supabase
          .from('engagement_module_assignments')
          .insert(insertData);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      refetchModuleAssignments();
      toast({ title: 'Module scoping assignments saved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save module assignments',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Toggle engagement assignment mutation
  const toggleEngagementAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignmentUserId || !selectedAssignmentEngagementId) return;
      if (isUserAssignedToEngagement) {
        // Unassign
        const { error } = await supabase
          .from('engagement_assignments')
          .delete()
          .eq('user_id', selectedAssignmentUserId)
          .eq('engagement_id', selectedAssignmentEngagementId);
        if (error) throw error;
      } else {
        // Assign
        const { error } = await supabase
          .from('engagement_assignments')
          .insert({
            user_id: selectedAssignmentUserId,
            engagement_id: selectedAssignmentEngagementId,
            assigned_by: user?.id
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchEngagementAssignment();
      toast({
        title: isUserAssignedToEngagement ? 'Engagement unassigned' : 'Engagement assigned successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update engagement assignment',
        description: error.message,
        variant: 'destructive',
      });
    }
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

  // Delete user account mutation (removes user from Auth, roles, profiles, and assignments)
  const deleteUserRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        _user_id: userId,
      });
      if (error) {
        throw new Error(error.message || "Failed to delete user account.");
      }
      if (data?.success === false) {
        throw new Error(data?.error || "Failed to delete user account.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['client-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({ title: 'User account completely deleted' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete user account', 
        description: error.message,
        variant: 'destructive' 
      });
    }
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
    if (!role || typeof role !== 'string') return 'Unknown';
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
          Manage user roles, client assignments, clients, and engagements
        </p>
      </div>

      {/* Clients & Engagements side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients Column */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg font-bold">Clients</CardTitle>
              <CardDescription>All registered clients</CardDescription>
            </div>
            <Button onClick={() => {
              setClientToEdit(null);
              setShowClientDialog(true);
            }} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Client
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pt-4">
            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No clients found.
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="p-3 border rounded-lg bg-card hover:bg-accent/20 transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{client.name}</div>
                      {client.entity_type && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {client.entity_type}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setClientToEdit(client);
                          setShowClientDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-destructive hover:text-destructive/80"
                        onClick={() => setItemToDelete({ id: client.id, name: client.name, type: 'client' })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagements Column */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg font-bold">Engagements</CardTitle>
              <CardDescription>
                All client engagements
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!selectedClient && (
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  (Select a client first)
                </span>
              )}
              <Button 
                onClick={() => {
                  setEngagementToEdit(null);
                  setShowEngagementDialog(true);
                }} 
                size="sm"
                disabled={!selectedClient}
                title={!selectedClient ? "Select a client from the switcher first" : ""}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Engagement
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pt-4">
            {engagements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No engagements found.
              </div>
            ) : (
              <div className="space-y-3">
                {engagements.map((eng) => (
                  <div key={eng.id} className="p-3 border rounded-lg bg-card hover:bg-accent/20 transition-colors flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-semibold text-sm truncate">{eng.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        Client: {eng.client_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {eng.status && (
                        <Badge variant={eng.status === 'completed' ? 'default' : 'outline'} className="capitalize text-xs">
                          {eng.status.replace('_', ' ')}
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEngagementToEdit(eng);
                          setShowEngagementDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-destructive hover:text-destructive/80"
                        onClick={() => setItemToDelete({ id: eng.id, name: eng.name, type: 'engagement' })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
          <div className="flex gap-2">
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
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

            <Dialog open={isCreateClientAccountOpen} onOpenChange={setIsCreateClientAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Client Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Client User Account</DialogTitle>
                  <DialogDescription>
                    Register new client user credentials. They will be prompted to finish setup on their first login.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Enter full name"
                      value={newClientFullName}
                      onChange={(e) => setNewClientFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="client@company.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temporary Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewClientPassword ? 'text' : 'password'}
                        placeholder="Enter temporary password"
                        value={newClientPassword}
                        onChange={(e) => setNewClientPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowNewClientPassword(!showNewClientPassword)}
                      >
                        {showNewClientPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={() => createClientAccountMutation.mutate({ 
                      email: newClientEmail, 
                      password: newClientPassword,
                      fullName: newClientFullName
                    })}
                    disabled={!newClientEmail || !newClientPassword || !newClientFullName || createClientAccountMutation.isPending}
                    className="w-full"
                  >
                    {createClientAccountMutation.isPending ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                  {engagements
                    .filter((eng) => eng && typeof eng.id === 'string')
                    .map((eng) => (
                      <SelectItem key={eng.id} value={eng.id}>
                        {eng.client_name || 'Unknown'} - {eng.name || 'Unnamed'}
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
                  {users
                    .filter((u) => u && typeof u.user_id === 'string' && u.user_id.trim() !== '')
                    .map((u) => (
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
              {/* Engagement Assignment Section */}
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div>
                  <h3 className="font-semibold text-sm">Engagement Assignment</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isUserAssignedToEngagement 
                      ? "This user is currently assigned to this engagement." 
                      : "This user is not yet assigned to this engagement."}
                  </p>
                </div>
                <Button
                  onClick={() => toggleEngagementAssignmentMutation.mutate()}
                  variant={isUserAssignedToEngagement ? "outline" : "default"}
                  size="sm"
                  disabled={toggleEngagementAssignmentMutation.isPending}
                >
                  {toggleEngagementAssignmentMutation.isPending 
                    ? "Updating..." 
                    : isUserAssignedToEngagement 
                      ? "Remove Assignment" 
                      : "Assign"}
                </Button>
              </div>

              {isUserAssignedToEngagement ? (
                <div className="space-y-4">
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
                      const isChecked = tempSelectedModules.includes(mod.key);
                      return (
                        <div key={mod.key} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                          <Checkbox
                            id={`mod-${mod.key}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setTempSelectedModules(prev => 
                                checked 
                                  ? [...prev, mod.key] 
                                  : prev.filter(m => m !== mod.key)
                              );
                            }}
                          />
                          <Label htmlFor={`mod-${mod.key}`} className="text-sm font-medium cursor-pointer flex-1">
                            {mod.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-4 border-t mt-4">
                    <Button 
                      onClick={() => saveModuleScopingMutation.mutate()} 
                      disabled={saveModuleScopingMutation.isPending}
                    >
                      {saveModuleScopingMutation.isPending ? "Saving..." : "Save Scoping Assignments"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm bg-amber-50/20 border border-amber-200/50 rounded-lg">
                  Please click the "Assign" button above to assign this engagement to the user before configuring module scoping.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/20 border border-dashed rounded-lg">
              Please select an engagement and user to configure module assignments.
            </div>
          )}
        </CardContent>
      </Card>

      <CreateClientDialog open={showClientDialog} onOpenChange={handleClientOpenChange} clientToEdit={clientToEdit} />
      <CreateEngagementDialog open={showEngagementDialog} onOpenChange={handleEngagementOpenChange} engagementToEdit={engagementToEdit} />

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        {itemToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                Confirm Delete
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground mt-2">
                {itemToDelete.type === 'client' ? (
                  <span>
                    Are you sure you want to delete client <strong>{itemToDelete.name}</strong>? 
                    This action is permanent and will cascade delete all associated data, including engagements, reviews, and documents.
                  </span>
                ) : (
                  <span>
                    Are you sure you want to delete engagement <strong>{itemToDelete.name}</strong>? 
                    This action is permanent and will cascade delete all associated reviews, audits, and findings.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (itemToDelete) {
                    if (itemToDelete.type === 'client') {
                      deleteClientMutation.mutate(itemToDelete.id);
                    } else {
                      deleteEngagementMutation.mutate(itemToDelete.id);
                    }
                    setItemToDelete(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
