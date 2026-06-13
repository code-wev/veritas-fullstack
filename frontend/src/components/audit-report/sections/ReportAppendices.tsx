import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, FileText, ClipboardList, AlertCircle, User } from 'lucide-react';
import { useState } from 'react';

interface ReportAppendicesProps {
  reportId: string;
  engagementId: string;
}

export function ReportAppendices({ reportId, engagementId }: ReportAppendicesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sources');

  // Fetch appendix items
  const { data: appendixItems, isLoading } = useQuery({
    queryKey: ['audit-report-appendix-items', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_report_appendix_items')
        .select('*')
        .eq('report_id', reportId)
        .order('item_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch evidence files for source documentation
  const { data: evidenceFiles } = useQuery({
    queryKey: ['evidence-files', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence_files')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('filename');
      if (error) throw error;
      return data;
    },
  });

  // Fetch findings for action plan
  const { data: findings } = useQuery({
    queryKey: ['engagement-findings', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('findings')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('severity', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (type: string) => {
      const items = appendixItems?.filter(i => i.appendix_type === type) || [];
      const { error } = await supabase.from('audit_report_appendix_items').insert({
        report_id: reportId,
        appendix_type: type,
        item_order: items.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-appendix-items'] });
      toast({ title: 'Item added' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('audit_report_appendix_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-appendix-items'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('audit_report_appendix_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-appendix-items'] });
      toast({ title: 'Item deleted' });
    },
  });

  const syncSourceDocsMutation = useMutation({
    mutationFn: async () => {
      // Delete existing source documentation items
      await supabase
        .from('audit_report_appendix_items')
        .delete()
        .eq('report_id', reportId)
        .eq('appendix_type', 'source_documentation');

      // Create items from evidence files
      if (evidenceFiles && evidenceFiles.length > 0) {
        const items = evidenceFiles.map((file, idx) => ({
          report_id: reportId,
          appendix_type: 'source_documentation',
          item_order: idx + 1,
          filename: file.filename,
          file_size_kb: file.file_size ? Math.round(file.file_size / 1024 * 10) / 10 : null,
          file_type: file.file_type,
          evidence_file_id: file.id,
        }));
        await supabase.from('audit_report_appendix_items').insert(items);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-appendix-items'] });
      toast({ title: 'Source documentation synced from evidence files' });
    },
  });

  const syncActionPlanMutation = useMutation({
    mutationFn: async () => {
      // Delete existing action plan items
      await supabase
        .from('audit_report_appendix_items')
        .delete()
        .eq('report_id', reportId)
        .eq('appendix_type', 'action_plan');

      // Create items from findings
      if (findings && findings.length > 0) {
        const items = findings
          .filter(f => f.status !== 'closed')
          .map((finding, idx) => ({
            report_id: reportId,
            appendix_type: 'action_plan',
            item_order: idx + 1,
            finding_reference: `Finding #${idx + 1}: ${finding.title}`,
            management_action: finding.management_response || '',
            responsible_person: '',
            target_date: finding.target_remediation_date,
            action_status: finding.remediation_status || 'open',
          }));
        await supabase.from('audit_report_appendix_items').insert(items);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-appendix-items'] });
      toast({ title: 'Action plan synced from findings' });
    },
  });

  const sourceDocItems = appendixItems?.filter(i => i.appendix_type === 'source_documentation') || [];
  const actionPlanItems = appendixItems?.filter(i => i.appendix_type === 'action_plan') || [];
  const deficiencyItems = appendixItems?.filter(i => i.appendix_type === 'deficiencies') || [];
  const reviewerItems = appendixItems?.filter(i => i.appendix_type === 'reviewer_bio') || [];

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="sources" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Source Documentation
        </TabsTrigger>
        <TabsTrigger value="action_plan" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Action Plan
        </TabsTrigger>
        <TabsTrigger value="deficiencies" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Deficiencies Record
        </TabsTrigger>
        <TabsTrigger value="reviewer" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Lead Reviewer
        </TabsTrigger>
      </TabsList>

      {/* Source Documentation */}
      <TabsContent value="sources" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Appendix A: Source Documentation</CardTitle>
                <CardDescription>List of documents reviewed during the engagement</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => syncSourceDocsMutation.mutate()}>
                  Sync from Evidence
                </Button>
                <Button size="sm" onClick={() => addItemMutation.mutate('source_documentation')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-[100px]">Size (KB)</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceDocItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={item.filename || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { filename: e.target.value } })}
                        className="border-0 p-0 h-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.file_size_kb || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { file_size_kb: parseFloat(e.target.value) } })}
                        className="border-0 p-0 h-auto w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.file_type || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { file_type: e.target.value } })}
                        className="border-0 p-0 h-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItemMutation.mutate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Action Plan */}
      <TabsContent value="action_plan" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Appendix B: Management Action Plan</CardTitle>
                <CardDescription>Remediation actions for identified findings</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => syncActionPlanMutation.mutate()}>
                  Sync from Findings
                </Button>
                <Button size="sm" onClick={() => addItemMutation.mutate('action_plan')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finding</TableHead>
                  <TableHead>Management Action Plan</TableHead>
                  <TableHead className="w-[150px]">Responsible</TableHead>
                  <TableHead className="w-[120px]">Target Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionPlanItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top">
                      <Textarea
                        value={item.finding_reference || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { finding_reference: e.target.value } })}
                        className="min-h-[80px]"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        value={item.management_action || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { management_action: e.target.value } })}
                        className="min-h-[80px]"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={item.responsible_person || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { responsible_person: e.target.value } })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        type="date"
                        value={item.target_date || ''}
                        onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { target_date: e.target.value } })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItemMutation.mutate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Deficiencies Record */}
      <TabsContent value="deficiencies" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Appendix C: Records of Deficiencies</CardTitle>
                <CardDescription>Detailed evidence of identified deficiencies</CardDescription>
              </div>
              <Button size="sm" onClick={() => addItemMutation.mutate('deficiencies')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {deficiencyItems.map((item, idx) => (
              <Card key={item.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Deficiency Record #{idx + 1}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItemMutation.mutate(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={item.deficiency_description || ''}
                      onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { deficiency_description: e.target.value } })}
                      placeholder="Describe the deficiency..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Evidence Reference</label>
                    <Textarea
                      value={item.deficiency_evidence || ''}
                      onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { deficiency_evidence: e.target.value } })}
                      placeholder="Reference to supporting evidence..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {deficiencyItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No deficiency records added yet.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Lead Reviewer */}
      <TabsContent value="reviewer" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Appendix D: Lead Reviewer</CardTitle>
                <CardDescription>Professional biography and credentials</CardDescription>
              </div>
              {reviewerItems.length === 0 && (
                <Button size="sm" onClick={() => addItemMutation.mutate('reviewer_bio')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reviewer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviewerItems.map((item) => (
              <div key={item.id} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Reviewer Name</label>
                  <Input
                    value={item.reviewer_name || ''}
                    onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { reviewer_name: e.target.value } })}
                    placeholder="e.g., Claudius Otegbade"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Professional Biography</label>
                  <Textarea
                    value={item.reviewer_bio || ''}
                    onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { reviewer_bio: e.target.value } })}
                    placeholder="Enter professional biography, qualifications, and experience..."
                    rows={10}
                  />
                </div>
              </div>
            ))}
            {reviewerItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No reviewer information added yet.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
