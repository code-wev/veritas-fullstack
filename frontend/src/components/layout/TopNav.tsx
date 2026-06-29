import { useApp } from '@/contexts/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Building2, FolderOpen, LogOut, User, ChevronDown } from 'lucide-react';
import logoMark from '@/assets/logo-veritas-mark.png';
import { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDialog } from '@/components/dialogs/ProfileDialog';

export function TopNav() {
  const {
    user,
    clients,
    engagements,
    selectedClient,
    selectedEngagement,
    setSelectedClient,
    setSelectedEngagement,
    signOut,
  } = useApp();

  const { role } = useUserRole();
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });


  const location = useLocation();
  const navigate = useNavigate();
  const showSwitchers = location.pathname !== '/' && role !== 'client_user';
  // Show a Back button on every page except the firm-overview root, where
  // there's nothing meaningful to go back to.
  const showBackButton = location.pathname !== '/' && role !== 'client_user';

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setSelectedEngagement(null);
    }
  };

  const handleEngagementChange = (engagementId: string) => {
    const engagement = engagements.find((e) => e.id === engagementId);
    if (engagement) {
      setSelectedEngagement(engagement);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const userInitials = displayName
    ? displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        {/* Back button — hidden on firm-overview root */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1 h-8 px-2"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Back</span>
          </Button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src={logoMark} alt="Veritas logo" className="h-8 w-auto" />
          <span className="font-semibold text-foreground hidden sm:inline">Veritas</span>
        </div>

        {showSwitchers && (
          <>
            {/* Client Switcher */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedClient?.id || ''}
                onValueChange={handleClientChange}
              >
                <SelectTrigger className="w-[180px] h-9 bg-background">
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                  {clients.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No clients yet
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Engagement Switcher */}
            {selectedClient && (
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={selectedEngagement?.id || ''}
                  onValueChange={handleEngagementChange}
                >
                  <SelectTrigger className="w-[200px] h-9 bg-background">
                    <SelectValue placeholder="Select Engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map((engagement) => (
                      <SelectItem key={engagement.id} value={engagement.id}>
                        {engagement.name}
                      </SelectItem>
                    ))}
                    {engagements.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No engagements yet
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{displayName}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />
    </header>
  );
}
