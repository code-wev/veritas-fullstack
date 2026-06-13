import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface FindingsSummaryTableProps {
  reportId: string;
  findings: any[];
}

const categorizationOptions = [
  { value: 'no_findings', label: 'No Findings', color: 'bg-green-100 text-green-800' },
  { value: 'lesser_weakness', label: 'Lesser Weakness', color: 'bg-blue-100 text-blue-800' },
  { value: 'moderate_weakness', label: 'Moderate Weakness', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'important_weakness', label: 'Important Weakness', color: 'bg-orange-100 text-orange-800' },
  { value: 'complete_non_compliance', label: 'Complete Non-Compliance', color: 'bg-red-100 text-red-800' },
];

export function FindingsSummaryTable({ reportId, findings }: FindingsSummaryTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summaryItems, isLoading } = useQuery({
    queryKey: ['audit-report-findings-summary', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_report_findings_summary')
        .select('*')
        .eq('report_id', reportId)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('audit_report_findings_summary')
        .update({ ...updates, is_manually_edited: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-findings-summary'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('audit_report_findings_summary').insert({
        report_id: reportId,
        regulatory_requirement: 'New Requirement',
        finding_summary: '',
        categorization: 'no_findings',
        display_order: (summaryItems?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-findings-summary'] });
      toast({ title: 'Row added' });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('audit_report_findings_summary').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-findings-summary'] });
      toast({ title: 'Row deleted' });
    },
  });

  const getCategorizationBadge = (cat: string) => {
    const opt = categorizationOptions.find(o => o.value === cat);
    return opt ? (
      <Badge variant="outline" className={opt.color}>
        {opt.label}
      </Badge>
    ) : null;
  };

  // Calculate summary statistics
  const stats = {
    complete: summaryItems?.filter(i => i.categorization === 'complete_non_compliance').length || 0,
    important: summaryItems?.filter(i => i.categorization === 'important_weakness').length || 0,
    moderate: summaryItems?.filter(i => i.categorization === 'moderate_weakness').length || 0,
    lesser: summaryItems?.filter(i => i.categorization === 'lesser_weakness').length || 0,
    none: summaryItems?.filter(i => i.categorization === 'no_findings').length || 0,
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.complete}</div>
            <p className="text-xs text-muted-foreground">Complete Non-Compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive/80">{stats.important}</div>
            <p className="text-xs text-muted-foreground">Important Weakness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-warning">{stats.moderate}</div>
            <p className="text-xs text-muted-foreground">Moderate Weakness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.lesser}</div>
            <p className="text-xs text-muted-foreground">Lesser Weakness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-accent-foreground">{stats.none}</div>
            <p className="text-xs text-muted-foreground">No Findings</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Summary of Findings</CardTitle>
              <CardDescription>
                Overview of regulatory requirements and categorized findings
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => addItemMutation.mutate()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Regulatory Requirement</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead className="w-[200px]">Categorization</TableHead>
                <TableHead className="w-[100px]">Page Ref</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      value={item.regulatory_requirement}
                      onChange={(e) => updateItemMutation.mutate({
                        id: item.id,
                        updates: { regulatory_requirement: e.target.value }
                      })}
                      className="border-0 p-0 h-auto font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.finding_summary || ''}
                      onChange={(e) => updateItemMutation.mutate({
                        id: item.id,
                        updates: { finding_summary: e.target.value }
                      })}
                      className="border-0 p-0 h-auto text-sm"
                      placeholder="Enter finding summary..."
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.categorization || 'no_findings'}
                      onValueChange={(value) => updateItemMutation.mutate({
                        id: item.id,
                        updates: { categorization: value }
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categorizationOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.page_reference || ''}
                      onChange={(e) => updateItemMutation.mutate({
                        id: item.id,
                        updates: { page_reference: e.target.value }
                      })}
                      className="border-0 p-0 h-auto text-sm text-center"
                      placeholder="Page #"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!summaryItems || summaryItems.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No findings summary items. Click "Sync Findings" to auto-populate from the Findings Register, or add rows manually.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
