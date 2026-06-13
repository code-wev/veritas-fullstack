import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RelationshipRiskSectionProps {
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
  { num: 1, text: 'Does the Company define when a business relationship is formed?' },
  { num: 2, text: 'Does the Company keep a record of the purpose and intended nature of business relationships?' },
  { num: 3, text: 'Does the Company assess client risk at onboarding and periodically thereafter?', autoFlag: { trigger: 'no', title: 'No periodic review of relationship risk', severity: 'medium' } },
  { num: 4, text: 'Does the Company assess clients individually or via logical groupings (segments)?' },
  { num: 5, text: 'Are client risk factors documented (profile, occupation, business type, expected activity)?' },
  { num: 6, text: 'Does relationship-based assessment consider products and delivery channels used by the client?' },
  { num: 7, text: 'Does it consider client geography and transaction destination or source?' },
  { num: 8, text: 'Does it consider client characteristics and transactional patterns?' },
  { num: 9, text: 'Are higher risk indicators reflected (third parties, complexity, unknown source of funds)?' },
  { num: 10, text: 'Are mandatory high-risk triggers treated as high risk (listed person property, foreign PEP, unconfirmed BO with SMO)?', autoFlag: { trigger: 'no', title: 'Mandatory high-risk triggers not treated as high risk', severity: 'high' } },
  { num: 11, text: 'Are high-risk clients subject to prescribed special measures?', autoFlag: { trigger: 'no', title: 'Prescribed special measures not applied for high-risk relationships', severity: 'high' } },
  { num: 12, text: 'Does the Company document enhanced monitoring frequency for high-risk relationships?' },
  { num: 13, text: 'Does the Company document enhanced measures to keep client and BO info up to date?' },
  { num: 14, text: 'Are client risk ratings updated when risk changes occur (events, STR, adverse media, geography)?' },
  { num: 15, text: 'Is there evidence that the client risk model is actually applied (sample files, system screenshots)?' },
];

export function RelationshipRiskSection({ reviewId }: RelationshipRiskSectionProps) {
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
        .eq('section', 5)
        .order('question_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setResponses(data);
      } else {
        const newResponses = QUESTIONS.map(q => ({
          review_id: reviewId,
          section: 5,
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

    if (question?.autoFlag && updates.response === question.autoFlag.trigger) {
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
                <RadioGroupItem value="yes" id={`s5q${q.num}_yes`} />
                <Label htmlFor={`s5q${q.num}_yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`s5q${q.num}_no`} />
                <Label htmlFor={`s5q${q.num}_no`}>No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id={`s5q${q.num}_partial`} />
                <Label htmlFor={`s5q${q.num}_partial`}>Partial</Label>
              </div>
            </RadioGroup>
            
            {(response?.response === 'yes' || response?.response === 'partial') && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Document Reference</Label>
                <Textarea
                  value={response?.doc_reference || ''}
                  onChange={(e) => updateResponse(q.num, { doc_reference: e.target.value })}
                  placeholder="e.g., RBA Document, Section 4.1, Page 22"
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
