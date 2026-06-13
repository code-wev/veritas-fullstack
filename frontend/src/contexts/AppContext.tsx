import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  name: string;
  entity_type: string;
  description?: string;
}

interface Engagement {
  id: string;
  client_id: string;
  name: string;
  period_start: string;
  period_end: string;
  scope?: string;
  status: string;
}

interface AppContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  clients: Client[];
  engagements: Engagement[];
  selectedClient: Client | null;
  selectedEngagement: Engagement | null;
  setSelectedClient: (client: Client | null) => void;
  setSelectedEngagement: (engagement: Engagement | null) => void;
  refreshClients: () => Promise<void>;
  refreshEngagements: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshClients();
    } else {
      setClients([]);
      setEngagements([]);
      setSelectedClient(null);
      setSelectedEngagement(null);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClient) {
      refreshEngagements();
    } else {
      setEngagements([]);
      setSelectedEngagement(null);
    }
  }, [selectedClient]);

  const refreshClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setClients(data);
      if (data.length > 0 && !selectedClient) {
        setSelectedClient(data[0]);
      }
    }
  };

  const refreshEngagements = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('client_id', selectedClient.id)
      .order('period_start', { ascending: false });
    
    if (!error && data) {
      setEngagements(data);
      if (data.length > 0 && !selectedEngagement) {
        setSelectedEngagement(data[0]);
      } else if (data.length === 0) {
        setSelectedEngagement(null);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSelectedClient(null);
    setSelectedEngagement(null);
  };

  return (
    <AppContext.Provider value={{
      user,
      session,
      loading,
      clients,
      engagements,
      selectedClient,
      selectedEngagement,
      setSelectedClient,
      setSelectedEngagement,
      refreshClients,
      refreshEngagements,
      signOut
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
