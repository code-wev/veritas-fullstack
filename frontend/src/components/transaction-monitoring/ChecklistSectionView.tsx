import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import type { ChecklistSection } from './checklistTemplates';
import { useToast } from '@/hooks/use-toast';

interface Props {
  reviewId: string;
  submodule: string;
  sections: ChecklistSection[];
}

interface Response {
  item_code: string;
  is_checked: boolean;
  notes: string | null;
}

export function ChecklistSectionView({ reviewId, submodule, sections }: Props) {
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, submodule]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_checklist_responses')
      .select('item_code,is_checked,notes')
      .eq('review_id', reviewId)
      .eq('submodule', submodule);
    if (error) {
      toast({ title: 'Failed to load checklist', description: error.message, variant: 'destructive' });
    } else {
      const map: Record<string, Response> = {};
      (data ?? []).forEach((r) => {
        map[r.item_code] = { item_code: r.item_code, is_checked: !!r.is_checked, notes: r.notes };
      });
      setResponses(map);
    }
    setLoading(false);
  };

  const upsertItem = async (
    section: ChecklistSection,
    itemCode: string,
    itemText: string,
    isWatchOut: boolean,
    patch: Partial<Response>,
  ) => {
    const existing = responses[itemCode] ?? { item_code: itemCode, is_checked: false, notes: '' };
    const next = { ...existing, ...patch };
    setResponses((prev) => ({ ...prev, [itemCode]: next }));
    const { error } = await supabase.from('tm_checklist_responses').upsert(
      {
        review_id: reviewId,
        submodule,
        section_code: section.code,
        section_name: section.name,
        item_code: itemCode,
        item_text: itemText,
        is_watch_out: isWatchOut,
        is_checked: next.is_checked,
        notes: next.notes ?? null,
      },
      { onConflict: 'review_id,submodule,item_code' },
    );
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading checklist…</div>;

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const isWatchSection = section.code === 'watch_out';
        return (
          <Card key={section.code} className={isWatchSection ? 'border-destructive/40' : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isWatchSection && <AlertTriangle className="w-4 h-4 text-destructive" />}
                {section.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.items.map((item) => {
                const r = responses[item.code] ?? { item_code: item.code, is_checked: false, notes: '' };
                return (
                  <div key={item.code} className="space-y-2 pb-2 border-b last:border-b-0">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`${submodule}-${item.code}`}
                        checked={r.is_checked}
                        onCheckedChange={(v) =>
                          upsertItem(section, item.code, item.text, !!item.watchOut, { is_checked: !!v })
                        }
                      />
                      <Label
                        htmlFor={`${submodule}-${item.code}`}
                        className={`text-sm leading-snug font-normal cursor-pointer ${
                          item.watchOut ? 'text-destructive' : ''
                        }`}
                      >
                        {item.text}
                      </Label>
                    </div>
                    <Textarea
                      placeholder="Notes (optional)"
                      value={r.notes ?? ''}
                      onChange={(e) =>
                        setResponses((prev) => ({
                          ...prev,
                          [item.code]: { ...r, notes: e.target.value },
                        }))
                      }
                      onBlur={() =>
                        upsertItem(section, item.code, item.text, !!item.watchOut, {
                          notes: responses[item.code]?.notes ?? '',
                        })
                      }
                      className="min-h-[40px] text-xs"
                      rows={1}
                    />
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
