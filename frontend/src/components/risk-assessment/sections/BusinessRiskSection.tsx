import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessRiskSectionProps {
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
  { num: 1, text: 'Does the RBA assess products, services, and delivery channels?', autoFlag: { trigger: 'no', title: 'Core prescribed business elements missing', severity: 'high' } },
  { num: 2, text: 'Does the RBA assess geographic risk (where business operates and transacts)?', autoFlag: { trigger: 'no', title: 'Core prescribed business elements missing', severity: 'high' } },
  { num: 3, text: 'Does the RBA assess new developments and technologies before implementation?', autoFlag: { trigger: 'no', title: 'No pre-implementation risk assessment for new technology', severity: 'medium' } },
  { num: 4, text: 'Does the RBA assess clients and business relationships at an overall business level?' },
  { num: 5, text: 'Are foreign or domestic affiliates assessed where applicable?', hasNA: true },
  { num: 6, text: 'Are other relevant factors assessed (legal, structural, third-party providers)?' },
  { num: 7, text: 'Are higher risk products explicitly identified (EFTs, stored value, agents, non face to face)?' },
  { num: 8, text: 'Are higher risk delivery channels identified (online, agent network, remote onboarding)?' },
  { num: 9, text: 'Are higher risk geographies identified using credible sources (sanctions, FATF, advisories)?', autoFlag: { trigger: 'no', title: 'Geographic risk not supported by credible sources', severity: 'medium' } },
  { num: 10, text: 'Does the RBA document why certain elements are rated high or not high?' },
  { num: 11, text: 'Does the RBA identify key ML/TF threats relevant to the sector?' },
  { num: 12, text: 'Does the RBA identify vulnerabilities in business controls (people, process, technology)?' },
  { num: 13, text: 'Does the RBA consider third-party dependency and vendor risk?' },
  { num: 14, text: 'Does the RBA consider operational turnover and training risk?' },
  { num: 15, text: 'Does the RBA produce an overall business risk rating and sub-ratings where relevant?' },
];

export function BusinessRiskSection({ reviewId }: BusinessRiskSectionProps) {
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
        .eq('section', 3)
        .order('question_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setResponses(data);
      } else {
        // Initialize responses
        const newResponses = QUESTIONS.map(q => ({
          review_id: reviewId,
          section: 3,
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

    // Check auto-flag conditions
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
                <RadioGroupItem value="yes" id={`q${q.num}_yes`} />
                <Label htmlFor={`q${q.num}_yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`q${q.num}_no`} />
                <Label htmlFor={`q${q.num}_no`}>No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id={`q${q.num}_partial`} />
                <Label htmlFor={`q${q.num}_partial`}>Partial</Label>
              </div>
              {q.hasNA && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="na" id={`q${q.num}_na`} />
                  <Label htmlFor={`q${q.num}_na`}>N/A</Label>
                </div>
              )}
            </RadioGroup>
            
            {(response?.response === 'yes' || response?.response === 'partial') && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Document Reference (section/page)</Label>
                <Textarea
                  value={response?.doc_reference || ''}
                  onChange={(e) => updateResponse(q.num, { doc_reference: e.target.value })}
                  placeholder="e.g., RBA Document, Section 3.2, Page 15"
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
