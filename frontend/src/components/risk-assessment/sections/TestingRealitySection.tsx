import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestingRealitySectionProps {
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
  { num: 1, text: 'Do actual products used match products assessed in the RBA?', autoFlag: { triggers: ['no'], title: 'RBA does not reflect actual operations', severity: 'high' } },
  { num: 2, text: 'Do actual transaction corridors and geographies match RBA geography risk statements?', autoFlag: { triggers: ['no'], title: 'RBA does not reflect actual operations', severity: 'high' } },
  { num: 3, text: 'Do transaction volumes and values align with stated risk ratings?' },
  { num: 4, text: 'Do client types and segments match what is described in the RBA?' },
  { num: 5, text: 'Do STR themes and red flags observed align to higher risk indicators in the RBA?' },
  { num: 6, text: 'Are high-risk clients identified in practice also treated as high risk in the model?' },
  { num: 7, text: 'Are agents or introducers used and properly reflected in the RBA?', hasNA: true },
  { num: 8, text: 'Are third-party providers used and properly reflected in the RBA?' },
  { num: 9, text: 'Have new products or new tech been introduced and reflected in updates?', hasNA: true },
  { num: 10, text: 'Are there material gaps between the RBA and reality that were not remediated?', autoFlag: { triggers: ['yes'], title: 'Material RBA gaps not remediated', severity: 'high' } },
  { num: 11, text: 'Is there evidence of periodic review during the review period?' },
  { num: 12, text: 'Are mismatches documented with remediation actions?' },
];

export function TestingRealitySection({ reviewId }: TestingRealitySectionProps) {
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
        .eq('section', 8)
        .order('question_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setResponses(data);
      } else {
        const newResponses = QUESTIONS.map(q => ({
          review_id: reviewId,
          section: 8,
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
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This section tests whether the RBA matches actual business operations and transaction reality for the review period.
        </AlertDescription>
      </Alert>

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
                <RadioGroupItem value="yes" id={`s8q${q.num}_yes`} />
                <Label htmlFor={`s8q${q.num}_yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`s8q${q.num}_no`} />
                <Label htmlFor={`s8q${q.num}_no`}>No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id={`s8q${q.num}_partial`} />
                <Label htmlFor={`s8q${q.num}_partial`}>Partial</Label>
              </div>
              {q.hasNA && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="na" id={`s8q${q.num}_na`} />
                  <Label htmlFor={`s8q${q.num}_na`}>N/A</Label>
                </div>
              )}
            </RadioGroup>
            
            <div className="mt-2">
              <Label className="text-sm text-muted-foreground">Testing Notes / Evidence</Label>
              <Textarea
                value={response?.doc_reference || ''}
                onChange={(e) => updateResponse(q.num, { doc_reference: e.target.value })}
                placeholder="Document testing results and evidence..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
