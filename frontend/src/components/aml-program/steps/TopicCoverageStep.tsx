import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListChecks, AlertTriangle, Loader2, Building2 } from 'lucide-react';

interface TopicCoverageStepProps {
  ppReview: {
    id: string;
    business_activities: string[];
    uses_agents_branches: boolean;
    deals_in_virtual_currency: boolean;
    offers_international_efts: boolean;
    account_based_relationships: boolean;
  };
  onUpdate: (updates: any) => Promise<void>;
  onFlagsChange: () => void;
}

interface AutoFlagCondition {
  trigger_on?: string;
  flag_reason?: string;
}

interface TopicQuestion {
  id: string;
  control_area: string;
  control_category: string;
  question_number: number;
  question_text: string;
  regulatory_reference: string | null;
  auto_flag_condition: AutoFlagCondition | null;
}

interface TopicResponse {
  control_area: string;
  question_number: number;
  response: string | null;
  doc_reference: string | null;
  deficiency_flag: boolean;
  auto_flag_reason: string | null;
}

const BUSINESS_ACTIVITIES = [
  { id: 'remittance', label: 'Remittance / Money Transfer' },
  { id: 'fx', label: 'Foreign Exchange' },
  { id: 'virtual_currency', label: 'Deal in Virtual Currency' },
  { id: 'money_orders', label: 'Issuing or Redeeming Money Orders' },
  { id: 'other', label: 'Other MSB Activities' },
];

const TOPIC_SECTIONS = [
  { 
    area: 'topic_regulatory', 
    title: 'Regulatory References', 
    description: 'Required regulatory framework references',
    alwaysShow: true 
  },
  { 
    area: 'topic_kyc', 
    title: 'KYC and Verification', 
    description: 'Client identification and verification procedures',
    alwaysShow: true 
  },
  { 
    area: 'topic_bo', 
    title: 'Beneficial Ownership and Third Party', 
    description: 'BO determination and third party procedures',
    alwaysShow: true 
  },
  { 
    area: 'topic_reporting', 
    title: 'Reporting Requirements', 
    description: 'Transaction reporting procedures',
    alwaysShow: true 
  },
  { 
    area: 'topic_sanctions', 
    title: 'Sanctions and Terrorist Property', 
    description: 'Sanctions screening and terrorist property reporting',
    alwaysShow: true 
  },
  { 
    area: 'topic_monitoring', 
    title: 'Ongoing Monitoring and EDD', 
    description: 'Risk rating and enhanced due diligence',
    alwaysShow: true 
  },
  { 
    area: 'topic_agents', 
    title: 'Agents and Third Parties', 
    description: 'Agent oversight and agreements',
    showWhen: 'uses_agents_branches'
  },
  { 
    area: 'topic_ministerial', 
    title: 'Ministerial Directives and Law Enforcement', 
    description: 'Handling of directives and production orders',
    alwaysShow: true 
  },
];

export function TopicCoverageStep({ ppReview, onUpdate, onFlagsChange }: TopicCoverageStepProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<TopicQuestion[]>([]);
  const [responses, setResponses] = useState<Map<string, TopicResponse>>(new Map());
  const [businessActivities, setBusinessActivities] = useState<string[]>(ppReview.business_activities || []);
  const [usesAgents, setUsesAgents] = useState(ppReview.uses_agents_branches);
  const [dealsInVC, setDealsInVC] = useState(ppReview.deals_in_virtual_currency);
  const [offersEFT, setOffersEFT] = useState(ppReview.offers_international_efts);
  const [accountBased, setAccountBased] = useState(ppReview.account_based_relationships);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestionsAndResponses();
  }, [ppReview.id]);

  const loadQuestionsAndResponses = async () => {
    setLoading(true);
    try {
      // Load topic questions
      const { data: questionsData, error: qError } = await supabase
        .from('aml_program_question_templates')
        .select('*')
        .eq('submodule', 'policies_procedures')
        .like('control_area', 'topic_%')
        .eq('is_active', true)
        .order('sort_order');

      if (qError) throw qError;
      setQuestions(questionsData as unknown as TopicQuestion[]);

      // Load existing responses
      const { data: responsesData, error: rError } = await supabase
        .from('aml_pp_control_results')
        .select('*')
        .eq('pp_review_id', ppReview.id)
        .like('control_area', 'topic_%');

      if (rError) throw rError;

      const responseMap = new Map<string, TopicResponse>();
      responsesData?.forEach((r: any) => {
        const key = `${r.control_area}-${r.question_number}`;
        responseMap.set(key, {
          control_area: r.control_area,
          question_number: r.question_number,
          response: r.response,
          doc_reference: r.doc_reference,
          deficiency_flag: r.deficiency_flag,
          auto_flag_reason: r.auto_flag_reason,
        });
      });
      setResponses(responseMap);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load topic questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (controlArea: string, questionNum: number, field: keyof TopicResponse, value: any) => {
    const key = `${controlArea}-${questionNum}`;
    const currentResponse = responses.get(key) || {
      control_area: controlArea,
      question_number: questionNum,
      response: null,
      doc_reference: null,
      deficiency_flag: false,
      auto_flag_reason: null,
    };

    // Check for auto-flag trigger
    const question = questions.find(q => q.control_area === controlArea && q.question_number === questionNum);
    let deficiencyFlag = currentResponse.deficiency_flag;
    let autoFlagReason = currentResponse.auto_flag_reason;

    if (field === 'response' && question?.auto_flag_condition) {
      const condition = question.auto_flag_condition as AutoFlagCondition;
      if (condition.trigger_on && value === condition.trigger_on) {
        deficiencyFlag = true;
        autoFlagReason = condition.flag_reason || 'Deficiency identified';
      } else {
        deficiencyFlag = false;
        autoFlagReason = null;
      }
    }

    setResponses(new Map(responses.set(key, {
      ...currentResponse,
      [field]: value,
      deficiency_flag: deficiencyFlag,
      auto_flag_reason: autoFlagReason,
    })));
  };

  const saveBusinessModel = async () => {
    await onUpdate({
      business_activities: businessActivities,
      uses_agents_branches: usesAgents,
      deals_in_virtual_currency: dealsInVC,
      offers_international_efts: offersEFT,
      account_based_relationships: accountBased,
    });
  };

  const saveResponses = async () => {
    setSaving(true);
    try {
      // Save business model first
      await saveBusinessModel();

      // Save topic responses
      const upserts = Array.from(responses.entries()).map(([key, response]) => {
        const question = questions.find(
          q => q.control_area === response.control_area && q.question_number === response.question_number
        );
        return {
          pp_review_id: ppReview.id,
          control_area: response.control_area,
          control_category: question?.control_category || 'unknown',
          question_number: response.question_number,
          question_text: question?.question_text || '',
          response: response.response,
          doc_reference: response.doc_reference,
          deficiency_flag: response.deficiency_flag,
          auto_flag_reason: response.auto_flag_reason,
          severity_suggested: response.deficiency_flag ? 'medium' : null,
        };
      });

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('aml_pp_control_results')
          .upsert(upserts, {
            onConflict: 'pp_review_id,control_area,question_number',
          });

        if (error) throw error;
      }

      toast({
        title: 'Saved',
        description: 'Topic coverage responses saved successfully',
      });

      onFlagsChange();
    } catch (error) {
      console.error('Error saving responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to save responses',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const shouldShowSection = (section: typeof TOPIC_SECTIONS[0]) => {
    if (section.alwaysShow) return true;
    if (section.showWhen === 'uses_agents_branches' && usesAgents) return true;
    return false;
  };

  const getFlagsCount = () => {
    return Array.from(responses.values()).filter(r => r.deficiency_flag).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const flagsCount = getFlagsCount();

  return (
    <div className="space-y-6">
      {/* Business Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Model Selection
          </CardTitle>
          <CardDescription>
            Select applicable business activities to customize the topic coverage review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="font-medium">Applicable Business Activities</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BUSINESS_ACTIVITIES.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={activity.id}
                    checked={businessActivities.includes(activity.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBusinessActivities([...businessActivities, activity.id]);
                      } else {
                        setBusinessActivities(businessActivities.filter(a => a !== activity.id));
                      }
                    }}
                  />
                  <Label htmlFor={activity.id} className="text-sm">{activity.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="uses-agents"
                checked={usesAgents}
                onCheckedChange={(checked) => setUsesAgents(!!checked)}
              />
              <Label htmlFor="uses-agents">Uses Agents or Branches?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deals-vc"
                checked={dealsInVC}
                onCheckedChange={(checked) => setDealsInVC(!!checked)}
              />
              <Label htmlFor="deals-vc">Deals in Virtual Currency?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="offers-eft"
                checked={offersEFT}
                onCheckedChange={(checked) => setOffersEFT(!!checked)}
              />
              <Label htmlFor="offers-eft">Offers International EFTs?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="account-based"
                checked={accountBased}
                onCheckedChange={(checked) => setAccountBased(!!checked)}
              />
              <Label htmlFor="account-based">Account-Based Relationships?</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Step 3: Topic Coverage
              </CardTitle>
              <CardDescription>
                Review policy coverage for specific regulatory topics
              </CardDescription>
            </div>
            {flagsCount > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {flagsCount} Flag{flagsCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-4">
            {TOPIC_SECTIONS.filter(shouldShowSection).map((section) => {
              const sectionQuestions = questions.filter(q => q.control_area === section.area);

              return (
                <AccordionItem key={section.area} value={section.area} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{section.title}</span>
                      <span className="text-xs text-muted-foreground">{section.description}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {sectionQuestions.map((question) => {
                      const key = `${question.control_area}-${question.question_number}`;
                      const response = responses.get(key);
                      const hasFlag = response?.deficiency_flag;

                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border ${
                            hasFlag ? 'border-destructive bg-destructive/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-medium">{question.question_text}</span>
                            {hasFlag && (
                              <Badge variant="destructive" className="shrink-0 text-xs">
                                Flag
                              </Badge>
                            )}
                          </div>

                          {hasFlag && response?.auto_flag_reason && (
                            <div className="mb-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                              ⚠️ {response.auto_flag_reason}
                            </div>
                          )}

                          <RadioGroup
                            value={response?.response || ''}
                            onValueChange={(value) => updateResponse(question.control_area, question.question_number, 'response', value)}
                            className="flex gap-3"
                          >
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="yes" id={`${key}-yes`} />
                              <Label htmlFor={`${key}-yes`} className="text-xs">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="no" id={`${key}-no`} />
                              <Label htmlFor={`${key}-no`} className="text-xs">No</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="na" id={`${key}-na`} />
                              <Label htmlFor={`${key}-na`} className="text-xs">N/A</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="flex justify-end mt-6">
            <Button onClick={saveResponses} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Topic Coverage'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
