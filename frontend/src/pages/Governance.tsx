import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Building2, 
  UserCog,
  RefreshCw,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

const GOV_TAB_ORDER = ['board_oversight', 'senior_management', 'compliance_officer', 'compliance_function', 'frontline_oversight', 'change_management', 'summary'];
const GOV_TAB_LABELS: Record<string, string> = {
  'board_oversight': 'Board Oversight',
  'senior_management': 'Senior Management',
  'compliance_officer': 'Compliance Officer',
  'compliance_function': 'Compliance Function',
  'frontline_oversight': 'Frontline Oversight',
  'change_management': 'Change Management',
  'summary': 'Governance Summary',
};
import { BoardOversightSection } from '@/components/governance/sections/BoardOversightSection';
import { SeniorManagementSection } from '@/components/governance/sections/SeniorManagementSection';
import { ComplianceOfficerSection } from '@/components/governance/sections/ComplianceOfficerSection';
import { ComplianceFunctionSection } from '@/components/governance/sections/ComplianceFunctionSection';
import { FrontlineOversightSection } from '@/components/governance/sections/FrontlineOversightSection';
import { ChangeManagementSection } from '@/components/governance/sections/ChangeManagementSection';
import { GovernanceSummarySection } from '@/components/governance/sections/GovernanceSummarySection';

const submodules = [
  { id: 'board_oversight', label: 'Board Oversight', icon: Users, questions: 14 },
  { id: 'senior_management', label: 'Senior Management', icon: UserCheck, questions: 13 },
  { id: 'compliance_officer', label: 'Compliance Officer', icon: Shield, questions: 15 },
  { id: 'compliance_function', label: 'Compliance Function', icon: Building2, questions: 12 },
  { id: 'frontline_oversight', label: 'Frontline Oversight', icon: UserCog, questions: 12 },
  { id: 'change_management', label: 'Change Management', icon: RefreshCw, questions: 15 },
  { id: 'summary', label: 'Governance Summary', icon: FileText, questions: 0 },
];

export default function Governance() {
  const { selectedClient, selectedEngagement } = useApp();
  const [activeTab, setActiveTab] = useState('board_oversight');
  const [workflowFlags, setWorkflowFlags] = useState({ isLocked: false, canEdit: true });

  if (!selectedClient || !selectedEngagement) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Governance Review</h1>
          <p className="text-muted-foreground mt-1">
            Assess AML governance effectiveness, oversight, and escalation
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Please select a client and engagement to begin the governance review.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Governance Review</h1>
        <p className="text-muted-foreground mt-1">
          Assess AML governance effectiveness, oversight, independence, and escalation
        </p>
      </div>

      {/* Workflow Banner */}
      <ModuleWorkflowBanner
        engagementId={selectedEngagement.id}
        moduleKey="governance"
        tableName="governance_summary"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      {/* Module Purpose Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Module Purpose
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This module evaluates the governance framework supporting AML compliance, including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Board and senior management oversight and accountability</li>
            <li>Compliance Officer independence and authority</li>
            <li>Compliance function resourcing and effectiveness</li>
            <li>Frontline staff awareness and escalation procedures</li>
            <li>Change management and regulatory notification compliance</li>
          </ul>
          <p className="text-xs mt-3 text-muted-foreground/80">
            Interviews are conducted with key stakeholders. Auto-flags trigger when responses indicate potential control weaknesses.
          </p>
        </CardContent>
      </Card>

      {/* Submodule Tabs wrapped for scoping */}
      <div className={cn(
        "space-y-6 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full h-auto">
            {submodules.map((submodule) => (
              <TabsTrigger
                key={submodule.id}
                value={submodule.id}
                className="flex flex-col items-center gap-1 py-2 px-1 text-xs"
              >
                <submodule.icon className="h-4 w-4" />
                <span className="hidden lg:inline text-[10px] leading-tight text-center">
                  {submodule.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="board_oversight" className="mt-4">
            <BoardOversightSection engagementId={selectedEngagement.id} />
          </TabsContent>

          <TabsContent value="senior_management" className="mt-4">
            <SeniorManagementSection engagementId={selectedEngagement.id} />
          </TabsContent>

          <TabsContent value="compliance_officer" className="mt-4">
            <ComplianceOfficerSection engagementId={selectedEngagement.id} />
          </TabsContent>

          <TabsContent value="compliance_function" className="mt-4">
            <ComplianceFunctionSection engagementId={selectedEngagement.id} />
          </TabsContent>

          <TabsContent value="frontline_oversight" className="mt-4">
            <FrontlineOversightSection engagementId={selectedEngagement.id} />
          </TabsContent>

          <TabsContent value="change_management" className="mt-4">
            <ChangeManagementSection engagementId={selectedEngagement.id} />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <GovernanceSummarySection engagementId={selectedEngagement.id} />
          </TabsContent>
        </Tabs>
      </div>

      {(() => {
        const currentIndex = GOV_TAB_ORDER.indexOf(activeTab);
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < GOV_TAB_ORDER.length - 1;
        return (
          <SectionNavigationFooter
            onPrevious={hasPrev ? () => setActiveTab(GOV_TAB_ORDER[currentIndex - 1]) : undefined}
            onNext={hasNext ? () => setActiveTab(GOV_TAB_ORDER[currentIndex + 1]) : undefined}
            previousLabel={hasPrev ? GOV_TAB_LABELS[GOV_TAB_ORDER[currentIndex - 1]] : undefined}
            nextLabel={hasNext ? GOV_TAB_LABELS[GOV_TAB_ORDER[currentIndex + 1]] : undefined}
            showPrevious={hasPrev}
            showNext={hasNext}
            showSave={false}
          />
        );
      })()}
    </div>
  );
}
