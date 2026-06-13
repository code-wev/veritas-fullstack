import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientPortalLayout } from "@/components/layout/ClientPortalLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { isMsbEntityType } from "@/lib/msbActivities";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import ClientSelection from "./pages/ClientSelection";
import ClientPortal from "./pages/ClientPortal";
import Dashboard from "./pages/Dashboard";
import FirmOverview from "./pages/FirmOverview";
import MSBRegistration from "./pages/MSBRegistration";
import Governance from "./pages/Governance";
import AMLProgram from "./pages/AMLProgram";
import AMLPolicies from "./pages/aml-program/AMLPolicies";
import AMLRiskAssessment from "./pages/aml-program/AMLRiskAssessment";
import AMLTraining from "./pages/aml-program/AMLTraining";
import AMLEffectiveness from "./pages/aml-program/AMLEffectiveness";
import KYCReview from "./pages/KYCReview";
import TransactionReporting from "./pages/TransactionReporting";
import TransactionMonitoring from "./pages/TransactionMonitoring";
import ClientFiles from "./pages/ClientFiles";
import NotFound from "./pages/NotFound";
import Findings from "./pages/Findings";
import AuditReport from "./pages/AuditReport";
import SecurityAccess from "./pages/admin/SecurityAccess";
import Settings from "./pages/admin/Settings";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  withLayout = true,
  adminOnly = false,
  msbOnly = false,
  moduleKey,
}: {
  children: React.ReactNode;
  withLayout?: boolean;
  adminOnly?: boolean;
  msbOnly?: boolean;
  moduleKey?: string;
}) {
  const { user, loading, selectedClient, selectedEngagement } = useApp();
  const { role, isAdmin, isLoading: roleLoading } = useUserRole();

  // Fetch analyst module assignments to check narrowing
  const { data: moduleAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['route-module-assignments', selectedEngagement?.id, user?.id],
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
    enabled: !!user && !!selectedEngagement && role === 'analyst' && !!moduleKey,
  });

  const showLoading = loading || roleLoading || (role === 'analyst' && !!moduleKey && !!selectedEngagement && assignmentsLoading);

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect client_user to client portal
  if (role === 'client_user') {
    return <Navigate to="/client-portal" replace />;
  }

  // Block non-admins from admin routes
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Block non-MSB clients from MSB-only routes (sidebar already hides the link;
  // this catches direct URL navigation / bookmarks). When no client is selected,
  // fall through — the page will prompt to pick one.
  if (msbOnly && selectedClient && !isMsbEntityType(selectedClient.entity_type)) {
    return <Navigate to="/" replace />;
  }

  // Enforce module assignments guard for analysts
  if (role === 'analyst' && moduleKey && moduleAssignments.length > 0 && !moduleAssignments.includes(moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!withLayout) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

function ClientPortalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <ClientPortalLayout>{children}</ClientPortalLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route
        path="/client-portal"
        element={
          <ClientPortalRoute>
            <ClientPortal />
          </ClientPortalRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FirmOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute withLayout={false}>
            <ClientSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/firm-overview"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/msb-registration"
        element={
          <ProtectedRoute msbOnly moduleKey="msb_registration">
            <MSBRegistration />
          </ProtectedRoute>
        }
      />
      <Route
        path="/governance"
        element={
          <ProtectedRoute moduleKey="governance">
            <Governance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aml-program"
        element={
          <ProtectedRoute>
            <AMLProgram />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aml-program/policies"
        element={
          <ProtectedRoute moduleKey="aml_program">
            <AMLPolicies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aml-program/risk-assessment"
        element={
          <ProtectedRoute moduleKey="risk_assessment">
            <AMLRiskAssessment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aml-program/training"
        element={
          <ProtectedRoute moduleKey="training">
            <AMLTraining />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aml-program/effectiveness"
        element={
          <ProtectedRoute moduleKey="effectiveness">
            <AMLEffectiveness />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc-review"
        element={
          <ProtectedRoute moduleKey="kyc">
            <KYCReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction-reporting"
        element={
          <ProtectedRoute moduleKey="reporting">
            <TransactionReporting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction-monitoring"
        element={
          <ProtectedRoute moduleKey="monitoring">
            <TransactionMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction-monitoring/:submodule"
        element={
          <ProtectedRoute moduleKey="monitoring">
            <TransactionMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-files"
        element={
          <ProtectedRoute>
            <ClientFiles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/findings"
        element={
          <ProtectedRoute>
            <Findings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-report"
        element={
          <ProtectedRoute>
            <AuditReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <ProtectedRoute adminOnly>
            <SecurityAccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
