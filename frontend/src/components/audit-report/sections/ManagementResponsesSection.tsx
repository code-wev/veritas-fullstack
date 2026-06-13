import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save, AlertTriangle, CheckCircle2, Info, Calendar, User } from 'lucide-react';
import { getFindingTypeMeta, severityToFindingType, isDeficiency } from '@/lib/findingClassification';
import { cn } from '@/lib/utils';

interface ManagementResponsesSectionProps {
  findings: any[];
}

export function ManagementResponsesSection({ findings }: ManagementResponsesSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedResponses, setEditedResponses] = useState<Record<string, {
    response?: string;
    owner?: string;
    date?: string;
  }>>({});

  const updateMutation = useMutation({
    mutationFn: async ({ 
      findingId, 
      response, 
      owner, 
      date 
    }: { 
      findingId: string; 
      response?: string; 
      owner?: string; 
      date?: string;
    }) => {
      const { error } = await supabase
        .from('findings')
        .update({
          management_response: response,
          management_response_owner: owner,
          management_response_date: date ? new Date(date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', findingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-findings'] });
      toast({ title: 'Management response saved' });
    },
  });

  const getFindingMeta = (finding: any) =>
    getFindingTypeMeta(finding.finding_type ?? severityToFindingType(finding.severity));

  const getSeverityBadge = (finding: any) => {
    const meta = getFindingMeta(finding);
    return (
      <Badge variant="outline" className={cn('text-xs whitespace-nowrap', meta.badge)}>
        {meta.shortLabel}
      </Badge>
    );
  };

  // Management responses are collected for deficiencies above lesser weakness;
  // observations and partial-lesser don't require a formal management response.
  const findingsWithResponses = findings.filter(f => {
    const t = f.finding_type ?? severityToFindingType(f.severity);
    return isDeficiency(t) && t !== 'partial_lesser';
  });

  const getResponseStatus = (finding: any) => {
    const edited = editedResponses[finding.id];
    const hasResponse = edited?.response || finding.management_response;
    const hasOwner = edited?.owner || finding.management_response_owner;
    const hasDate = edited?.date || finding.management_response_date;
    
    if (hasResponse && hasOwner && hasDate) {
      return <Badge variant="outline" className="text-primary">Complete</Badge>;
    } else if (hasResponse || hasOwner || hasDate) {
      return <Badge variant="outline" className="text-warning">Partial</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          Management responses are optional storage for client remediation plans. This section is not validated or scored.
        </span>
      </div>

      {/* Response Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{findingsWithResponses.length}</div>
            <p className="text-xs text-muted-foreground">Findings Requiring Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">
              {findingsWithResponses.filter(f => f.management_response).length}
            </div>
            <p className="text-xs text-muted-foreground">Responses Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-warning">
              {findingsWithResponses.filter(f => !f.management_response).length}
            </div>
            <p className="text-xs text-muted-foreground">Pending Response</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Management Response Tracker</CardTitle>
          <CardDescription>
            Document management's response to findings, including remediation plans and target dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Finding</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead>Management Response</TableHead>
                <TableHead className="w-[150px]">Responsible Owner</TableHead>
                <TableHead className="w-[140px]">Target Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findingsWithResponses.map((finding) => {
                const edited = editedResponses[finding.id] || {};
                const response = edited.response ?? finding.management_response ?? '';
                const owner = edited.owner ?? finding.management_response_owner ?? '';
                const date = edited.date ?? 
                  (finding.management_response_date 
                    ? new Date(finding.management_response_date).toISOString().split('T')[0] 
                    : '');

                const hasChanges = 
                  (edited.response !== undefined && edited.response !== finding.management_response) ||
                  (edited.owner !== undefined && edited.owner !== finding.management_response_owner) ||
                  (edited.date !== undefined && edited.date !== (finding.management_response_date?.split('T')[0] || ''));

                return (
                  <TableRow key={finding.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{finding.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[230px]">
                        {finding.module.replace(/_/g, ' ')}
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(finding)}</TableCell>
                    <TableCell>
                      <Textarea
                        value={response}
                        onChange={(e) => setEditedResponses({
                          ...editedResponses,
                          [finding.id]: { ...edited, response: e.target.value }
                        })}
                        placeholder="Enter management response..."
                        rows={2}
                        className="text-sm min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={owner}
                        onChange={(e) => setEditedResponses({
                          ...editedResponses,
                          [finding.id]: { ...edited, owner: e.target.value }
                        })}
                        placeholder="Name/Title"
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setEditedResponses({
                          ...editedResponses,
                          [finding.id]: { ...edited, date: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {getResponseStatus(finding)}
                        {hasChanges && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({
                              findingId: finding.id,
                              response: edited.response ?? finding.management_response,
                              owner: edited.owner ?? finding.management_response_owner,
                              date: edited.date ?? finding.management_response_date?.split('T')[0],
                            })}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {findingsWithResponses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No medium, high, or critical findings requiring management response.
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
