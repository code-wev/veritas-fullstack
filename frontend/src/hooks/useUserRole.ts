import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export type AppRole = 'analyst' | 'manager' | 'partner' | 'admin' | 'client_user';

interface UserRoleData {
  role: AppRole | null;
  canEditReport: boolean;
  canEditFindings: boolean;
  canCreateClients: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user } = useApp();
  
  const { data: roleData, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return { role: null, canEditReport: false, canEditFindings: false, canCreateClients: false };

      // Get user's highest role
      const { data: roleResult } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      // Check edit permissions
      const { data: canEditReport } = await supabase
        .rpc('can_edit_audit_report', { _user_id: user.id });

      const { data: canEditFindings } = await supabase
        .rpc('can_edit_findings', { _user_id: user.id });

      const { data: canCreateClients } = await supabase
        .rpc('can_create_clients', { _user_id: user.id });

      return {
        role: roleResult as AppRole | null,
        canEditReport: canEditReport ?? false,
        canEditFindings: canEditFindings ?? false,
        canCreateClients: canCreateClients ?? false,
      };
    },
  });

  const role = roleData?.role ?? null;
  
  return {
    role,
    canEditReport: roleData?.canEditReport ?? false,
    canEditFindings: roleData?.canEditFindings ?? false,
    canCreateClients: roleData?.canCreateClients ?? false,
    isAdmin: role === 'admin',
    isLoading,
  };
}

export const ROLE_LABELS: Record<AppRole, string> = {
  analyst: 'Analyst',
  manager: 'Manager',
  partner: 'Partner',
  admin: 'Administrator',
  client_user: 'Client',
};

export const ROLE_PERMISSIONS = {
  analyst: { editReport: false, editFindings: 'draft' },
  manager: { editReport: false, editFindings: 'review' },
  partner: { editReport: true, editFindings: 'final' },
  admin: { editReport: true, editFindings: 'final' },
  client_user: { editReport: false, editFindings: 'response_only' },
} as const;
