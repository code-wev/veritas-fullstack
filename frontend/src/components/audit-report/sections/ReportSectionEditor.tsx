import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ReportSectionEditorProps {
  section: any;
}

export function ReportSectionEditor({ section }: ReportSectionEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [content, setContent] = useState(section.content || '');
  const [isVisible, setIsVisible] = useState(section.is_visible);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('audit_report_sections')
        .update({ content, is_visible: isVisible, updated_at: new Date().toISOString() })
        .eq('id', section.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-sections'] });
      toast({ title: 'Section saved' });
    },
  });

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {isVisible ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="text-left">
                <CardTitle className="text-base">{section.section_title}</CardTitle>
                <CardDescription className="text-xs">
                  Section {section.section_order} • {section.source_module ? `Source: ${section.source_module}` : 'Manual content'}
                </CardDescription>
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id={`visible-${section.id}`}
                  checked={isVisible}
                  onCheckedChange={setIsVisible}
                />
                <Label htmlFor={`visible-${section.id}`} className="text-sm">
                  Include in report
                </Label>
              </div>
              <Button 
                size="sm" 
                onClick={() => updateMutation.mutate()} 
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>

            {section.is_editable && (
              <div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter section content... Use [PLACEHOLDERS] for dynamic values."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Available placeholders: [CLIENT_NAME], [COMPANY_NAME], [PERIOD_START], [PERIOD_END], [MSB_NUMBER], [JURISDICTION]
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
