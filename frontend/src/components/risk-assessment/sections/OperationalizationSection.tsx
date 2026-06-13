import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OperationalizationSectionProps {
  reviewId: string;
}

interface Response {
  id: string;
  question_number: number;
  question_text: string;
  response: string | null;
  response_details: string | null;
  doc_reference: string | null;
  auto_flag: boolean;
  auto_flag_reason: string | null;
}

const QUESTIONS = [
  { num: 1, text: 'Are RBA outputs embedded into policies and procedures?' },
  { num: 2, text: 'Are RBA outputs embedded into training content and job aids?' },
  { num: 3, text: 'Are RBA outputs embedded into transaction monitoring logic (rules, thresholds)?', autoFlag: { triggers: ['no', 'partial'], title: 'RBA not operationalized into transaction monitoring controls', severity: 'medium' } },
  { num: 4, text: 'Are RBA outputs embedded into EDD triggers and approvals?' },
  { num: 5, text: 'Are high-risk countries in the RBA aligned to sanctions screening configuration?' },
  { num: 6, text: 'Are STR trends reviewed and used to update RBA assumptions?' },
  { num: 7, text: 'Is adverse media risk considered and operationalized?' },
  { num: 8, text: 'Are vendor controls documented and tested (screening, onboarding, monitoring tools)?' },
  { num: 9, text: 'Is there documented escalation to compliance for high-risk events?' },
  { num: 10, text: 'Are limits or controls implemented for high-risk products (EFT corridors, caps, approvals)?' },
  { num: 11, text: 'Are exceptions tracked when activity falls outside profile?' },
  { num: 12, text: 'Are ongoing monitoring outcomes recorded and retrievable?', autoFlag: { triggers: ['no'], title: 'Ongoing monitoring evidence not retained', severity: 'high' } },
  { num: 13, text: 'Are "risk acceptance" decisions documented when residual risk remains high?', hasNA: true },
  { num: 14, text: 'Are control failures tracked (missed reporting, TM gaps, outages)?' },
  { num: 15, text: 'Are corrective actions tracked to completion?', autoFlag: { triggers: ['no'], title: 'Corrective action tracking not evidenced', severity: 'medium' } },
];

export function OperationalizationSection({ reviewId }: OperationalizationSectionProps) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadResponses();
  }, [reviewId]);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rba_responses')
        .select('*')
        .eq('review_id', reviewId)
        .eq('section', 7)
        .order('question_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setResponses(data);
      } else {
        const newResponses = QUESTIONS.map(q => ({
          review_id: reviewId,
          section: 7,
          question_number: q.num,
          question_text: q.text,
          response: null,
          response_details: null,
          doc_reference: null,
          auto_flag: false,
          auto_flag_reason: null,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('rba_responses')
          .insert(newResponses)
          .select();

        if (insertError) throw insertError;
        setResponses(inserted || []);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
      toast({ title: 'Error', description: 'Failed to load responses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = async (questionNumber: number, updates: Partial<Response>) => {
    const response = responses.find(r => r.question_number === questionNumber);
    if (!response) return;

    const question = QUESTIONS.find(q => q.num === questionNumber);
    let autoFlag = false;
    let autoFlagReason = null;

    if (question?.autoFlag && question.autoFlag.triggers.includes(updates.response || '')) {
      autoFlag = true;
      autoFlagReason = question.autoFlag.title;
    }

    try {
      const { error } = await supabase
        .from('rba_responses')
        .update({ ...updates, auto_flag: autoFlag, auto_flag_reason: autoFlagReason })
        .eq('id', response.id);

      if (error) throw error;

      setResponses(prev => prev.map(r => 
        r.id === response.id 
          ? { ...r, ...updates, auto_flag: autoFlag, auto_flag_reason: autoFlagReason }
          : r
      ));
    } catch (error) {
      console.error('Error updating response:', error);
      toast({ title: 'Error', description: 'Failed to save response', variant: 'destructive' });
    }
  };

  const autoFlags = responses.filter(r => r.auto_flag);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {autoFlags.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Flagged Issues:</strong>
            <ul className="list-disc ml-4 mt-2">
              {autoFlags.map((flag) => (
                <li key={flag.id}>{flag.auto_flag_reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {QUESTIONS.map((q) => {
        const response = responses.find(r => r.question_number === q.num);
        return (
          <div key={q.num} className="space-y-3 pb-4 border-b border-border last:border-0">
            <Label className="text-base font-medium">
              {q.num}. {q.text}
            </Label>
            <RadioGroup
              value={response?.response || ''}
              onValueChange={(value) => updateResponse(q.num, { response: value })}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`s7q${q.num}_yes`} />
                <Label htmlFor={`s7q${q.num}_yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`s7q${q.num}_no`} />
                <Label htmlFor={`s7q${q.num}_no`}>No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id={`s7q${q.num}_partial`} />
                <Label htmlFor={`s7q${q.num}_partial`}>Partial</Label>
              </div>
              {q.hasNA && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="na" id={`s7q${q.num}_na`} />
                  <Label htmlFor={`s7q${q.num}_na`}>N/A</Label>
                </div>
              )}
            </RadioGroup>
            
            {(response?.response === 'yes' || response?.response === 'partial') && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Notes / Evidence Reference</Label>
                <Textarea
                  value={response?.doc_reference || ''}
                  onChange={(e) => updateResponse(q.num, { doc_reference: e.target.value })}
                  placeholder="Document evidence or reference..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
