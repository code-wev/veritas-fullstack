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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Building2, FolderOpen, LogOut, User, ChevronDown, Plus } from 'lucide-react';
import logoMark from '@/assets/logo-veritas-mark.png';
import { useState } from 'react';
import { CreateClientDialog } from '@/components/dialogs/CreateClientDialog';
import { CreateEngagementDialog } from '@/components/dialogs/CreateEngagementDialog';
import { useUserRole } from '@/hooks/useUserRole';

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

  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showEngagementDialog, setShowEngagementDialog] = useState(false);
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

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
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
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setShowClientDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Client
                    </Button>
                  </div>
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
                    <DropdownMenuSeparator />
                    <div className="p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setShowEngagementDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Engagement
                      </Button>
                    </div>
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
              <span>{user?.user_metadata?.full_name || 'User'}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
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

      <CreateClientDialog open={showClientDialog} onOpenChange={setShowClientDialog} />
      <CreateEngagementDialog open={showEngagementDialog} onOpenChange={setShowEngagementDialog} />
    </header>
  );
}
