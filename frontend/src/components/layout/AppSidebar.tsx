import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Radar,
  Building2,
  Users,
  FileText,
  Shield,
  UserCheck,
  FileBarChart,
  Activity,
  FolderOpen,
  AlertTriangle,
  FileOutput,
  Settings,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  CheckCircle,
  Search,
  Bell,
  UserCog,
  Calculator,
  ClipboardCheck,
  History,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { isMsbEntityType } from '@/lib/msbActivities';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubModule {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface Module {
  name: string;
  icon: React.ElementType;
  path: string;
  children?: SubModule[];
}

const modules: Module[] = [
  {
    name: 'Firm Overview',
    icon: Radar,
    path: '/',
  },
  {
    name: 'Engagement Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    name: 'MSB Registration',
    icon: Building2,
    path: '/msb-registration',
  },
  {
    name: 'Governance',
    icon: Users,
    path: '/governance',
  },
  {
    name: 'AML Program',
    icon: FileText,
    path: '/aml-program',
    children: [
      { name: 'Policies & Procedures', path: '/aml-program/policies', icon: FileText },
      { name: 'Risk Assessment', path: '/aml-program/risk-assessment', icon: Shield },
      { name: 'Training Program', path: '/aml-program/training', icon: GraduationCap },
      { name: 'Effectiveness', path: '/aml-program/effectiveness', icon: CheckCircle },
    ],
  },
  {
    name: 'KYC Review',
    icon: UserCheck,
    path: '/kyc-review',
  },
  {
    name: 'Transaction Reporting',
    icon: FileBarChart,
    path: '/transaction-reporting',
  },
  {
    name: 'Transaction Monitoring',
    icon: Activity,
    path: '/transaction-monitoring',
    children: [
      { name: 'Sanctions / PEP / HIO Screening', path: '/transaction-monitoring/screening', icon: Search },
      { name: 'Alert Review', path: '/transaction-monitoring/alerts', icon: Bell },
      { name: 'High-Risk Customer EDD', path: '/transaction-monitoring/edd', icon: UserCog },
      { name: 'Risk Rating Recalculation', path: '/transaction-monitoring/risk-recalc', icon: Calculator },
      { name: 'FINTRAC Exam Remediation', path: '/transaction-monitoring/fintrac-remediation', icon: ClipboardCheck },
      { name: 'Prior Review Remediation', path: '/transaction-monitoring/prior-review-remediation', icon: History },
    ],
  },
  {
    name: 'Client Files',
    icon: FolderOpen,
    path: '/client-files',
  },
  {
    name: 'Findings',
    icon: AlertTriangle,
    path: '/findings',
  },
  {
    name: 'Audit Report',
    icon: FileOutput,
    path: '/audit-report',
  },
];

const adminModules: Module[] = [
  {
    name: 'Security & Access',
    icon: Shield,
    path: '/admin/security',
  },
  {
    name: 'Settings',
    icon: Settings,
    path: '/admin/settings',
  },
];

const ROUTE_TO_MODULE_KEY: Record<string, string> = {
  '/msb-registration': 'msb_registration',
  '/governance': 'governance',
  '/aml-program/policies': 'aml_program',
  '/aml-program/risk-assessment': 'risk_assessment',
  '/aml-program/training': 'training',
  '/aml-program/effectiveness': 'effectiveness',
  '/kyc-review': 'kyc',
  '/transaction-reporting': 'reporting',
  '/transaction-monitoring': 'monitoring',
};

const getModuleKeyForPath = (path: string): string | null => {
  if (path.startsWith('/transaction-monitoring')) return 'monitoring';
  return ROUTE_TO_MODULE_KEY[path] || null;
};

export function AppSidebar() {
  const location = useLocation();
  const { selectedClient, selectedEngagement, user } = useApp();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { role, isAdmin } = useUserRole();

  // Fetch analyst module assignments to check narrowing
  const { data: moduleAssignments = [] } = useQuery({
    queryKey: ['sidebar-module-assignments', selectedEngagement?.id, user?.id],
    queryFn: async () => {
      if (!user || !selectedEngagement) return [];
      const { data, error } = await supabase
        .from('engagement_module_assignments')
        .select('module')
        .eq('user_id', user.id)
        .eq('engagement_id', selectedEngagement.id);
      if (error) throw error;
      return data.map((d: any) => d.module) as string[];
    },
    enabled: !!user && !!selectedEngagement && role === 'analyst',
  });

  const filterModules = (mods: Module[]) => {
    // If not analyst or no assignments on this engagement, opt-in behavior: show everything
    if (role !== 'analyst' || moduleAssignments.length === 0) {
      return mods;
    }

    return mods
      .map((mod) => {
        // If the module has children (e.g., AML Program), filter the children first
        if (mod.children) {
          const filteredChildren = mod.children.filter((child) => {
            const key = getModuleKeyForPath(child.path);
            if (!key) return true; // not scoped
            return moduleAssignments.includes(key);
          });
          if (filteredChildren.length === 0) {
            return null; // hide parent because no children are assigned
          }
          return {
            ...mod,
            children: filteredChildren,
          };
        }

        // If the module doesn't have children, check the module itself
        const key = getModuleKeyForPath(mod.path);
        if (!key) return mod; // not scoped, show it
        if (moduleAssignments.includes(key)) {
          return mod; // assigned, show it
        }
        return null; // not assigned, hide it
      })
      .filter((mod): mod is Module => mod !== null);
  };

  // Show the MSB Registration module only when the client's entity type is
  // MSB-related (or when no client is selected — fall through to default).
  const showMsbModule = selectedClient ? isMsbEntityType(selectedClient.entity_type) : true;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isParentActive = (mod: Module) => {
    if (mod.children) {
      return mod.children.some((c) => location.pathname.startsWith(c.path));
    }
    return isActive(mod.path);
  };

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  // Auto-expand if a child is active
  const isExpanded = (mod: Module) => {
    if (mod.children?.some((c) => location.pathname.startsWith(c.path))) return true;
    return expanded[mod.path] ?? false;
  };

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0">
      {selectedEngagement && (
        <div className="p-4 border-b border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Current Engagement
          </div>
          <div className="font-medium text-sm text-foreground truncate">
            {selectedEngagement.name}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(selectedEngagement.period_start).toLocaleDateString()} -{' '}
            {new Date(selectedEngagement.period_end).toLocaleDateString()}
          </div>
        </div>
      )}

      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {filterModules(modules)
            .filter((mod) => mod.path !== '/msb-registration' || showMsbModule)
            .map((module) =>
            module.children ? (
              <div key={module.path}>
                <button
                  onClick={() => toggleExpand(module.path)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full',
                    isParentActive(module)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <module.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{module.name}</span>
                  {isExpanded(module) ? (
                    <ChevronDown className="w-4 h-4 ml-auto shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
                  )}
                </button>
                {isExpanded(module) && (
                  <div className="ml-4 pl-3 border-l border-border mt-1 space-y-1">
                    {module.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                          isActive(child.path)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{child.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={module.path}
                to={module.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive(module.path)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <module.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{module.name}</span>
                {isActive(module.path) && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </NavLink>
            )
          )}
        </div>

        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="px-3 mb-2 text-xs text-muted-foreground uppercase tracking-wider">
              Administration
            </div>
            <div className="space-y-1">
              {adminModules.map((module) => (
                <NavLink
                  key={module.path}
                  to={module.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive(module.path)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <module.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{module.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
