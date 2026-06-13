import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FieldKey =
  | 'alert_review_procedure_text'
  | 'edd_procedure_text'
  | 'risk_recalc_procedure_text'
  | 'screening_procedure_text'
  | 'fintrac_remediation_procedure_text'
  | 'prior_review_remediation_procedure_text';

interface Props {
  reviewId: string;
  field: FieldKey;
  title: string;
  description: string;
  placeholder?: string;
}

export function ProcedureNarrative({ reviewId, field, title, description, placeholder }: Props) {
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tm_reviews').select(field).eq('id', reviewId).maybeSingle();
      if (!cancelled) {
        if (error) toast({ title: 'Failed to load procedure text', description: error.message, variant: 'destructive' });
        setValue(((data as Record<string, string | null> | null)?.[field]) ?? '');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, field]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('tm_reviews').update({ [field]: value }).eq('id', reviewId);
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Saved', description: 'Procedure narrative saved.' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button size="sm" onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Save className="w-4 h-4 mr-1"/>}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          rows={8}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? 'Paste or type the relevant policy / procedure / risk-assessment excerpt here. This text will be carried into the audit report ahead of the testing results.'}
          disabled={loading}
        />
      </CardContent>
    </Card>
  );
}
