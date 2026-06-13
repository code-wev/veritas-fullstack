import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadButton } from './UploadButton';
import { UploadList } from './UploadList';

interface Template {
  id: string;
  entity_profile: string;
  section: string;
  item_number: number;
  description: string;
  sort_order: number;
}

interface Response {
  template_id: string;
  status: string;
  comment: string | null;
}

interface Props {
  engagementId: string;
  clientId: string;
  entityProfile: 'msb' | 'trust';
}

const SECTION_LABELS: Record<string, string> = {
  organizational: 'Organizational & Risk Management Information',
  framework: 'AML/ATF Framework Documentation',
  data_files: 'Data Files (for the Period of Review)',
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  received: { label: 'Received', variant: 'default' },
  na: { label: 'N/A', variant: 'secondary' },
};

export function DocumentRequestChecklist({ engagementId, clientId, entityProfile }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, entityProfile]);

  const load = async () => {
    setLoading(true);
    const [tplRes, respRes] = await Promise.all([
      supabase
        .from('client_files_checklist_templates')
        .select('id, entity_profile, section, item_number, description, sort_order')
        .eq('entity_profile', entityProfile)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('client_files_checklist_responses')
        .select('template_id, status, comment')
        .eq('engagement_id', engagementId),
    ]);
    if (tplRes.error) toast({ title: 'Failed to load checklist', description: tplRes.error.message, variant: 'destructive' });
    if (respRes.error) toast({ title: 'Failed to load responses', description: respRes.error.message, variant: 'destructive' });
    setTemplates(tplRes.data || []);
    const byTpl: Record<string, Response> = {};
    (respRes.data || []).forEach((r) => { byTpl[r.template_id] = r; });
    setResponses(byTpl);
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const out: Record<string, Template[]> = {};
    templates.forEach((t) => {
      out[t.section] = out[t.section] || [];
      out[t.section].push(t);
    });
    return out;
  }, [templates]);

  const updateResponse = async (templateId: string, patch: Partial<Response>) => {
    const next = { ...(responses[templateId] || { template_id: templateId, status: 'pending', comment: null }), ...patch };
    setResponses((prev) => ({ ...prev, [templateId]: next }));
    const { error } = await supabase
      .from('client_files_checklist_responses')
      .upsert(
        { engagement_id: engagementId, template_id: templateId, status: next.status, comment: next.comment },
        { onConflict: 'engagement_id,template_id' },
      );
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading checklist…</div>;

  const totals = templates.reduce(
    (acc, t) => {
      const s = responses[t.id]?.status ?? 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { pending: 0, received: 0, na: 0 } as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Document Request List — {entityProfile === 'msb' ? 'MSB' : 'Trust Company'}
          </CardTitle>
          <CardDescription>
            Standard regulatory request list. Mark each item as Received / N/A and attach the supporting file.
            Exact-duplicate uploads are blocked within the engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Badge variant="outline">{totals.pending} pending</Badge>
          <Badge>{totals.received} received</Badge>
          <Badge variant="secondary">{totals.na} N/A</Badge>
          <Badge variant="secondary">{templates.length} total</Badge>
        </CardContent>
      </Card>

      {Object.keys(SECTION_LABELS).map((section) => {
        const items = grouped[section] || [];
        if (items.length === 0) return null;
        return (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-sm">{SECTION_LABELS[section]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((t) => {
                const r = responses[t.id];
                const status = r?.status ?? 'pending';
                const badge = STATUS_BADGE[status];
                return (
                  <div key={t.id} className="border border-border rounded-md p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-xs font-mono text-muted-foreground pt-0.5 w-6 shrink-0">
                        {t.item_number}.
                      </div>
                      <div className="flex-1 text-sm text-foreground">{t.description}</div>
                      <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-9">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={status} onValueChange={(v) => updateResponse(t.id, { status: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="na">N/A — Not Applicable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Comment</Label>
                        <Textarea
                          value={r?.comment ?? ''}
                          onChange={(e) => setResponses((p) => ({
                            ...p,
                            [t.id]: { ...(p[t.id] ?? { template_id: t.id, status }), comment: e.target.value, status: p[t.id]?.status ?? status, template_id: t.id },
                          }))}
                          onBlur={(e) => updateResponse(t.id, { comment: e.target.value })}
                          rows={1}
                          placeholder="Optional notes…"
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div className="pl-9 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Attached files</Label>
                        <UploadButton
                          engagementId={engagementId}
                          clientId={clientId}
                          templateId={t.id}
                          onUploaded={() => setRefreshKey((k) => k + 1)}
                        />
                      </div>
                      <UploadList
                        engagementId={engagementId}
                        templateId={t.id}
                        refreshKey={refreshKey}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
