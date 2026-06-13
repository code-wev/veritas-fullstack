import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientSegmentBuilderProps {
  reviewId: string;
}

type SegmentType = 'individual_clients' | 'business_clients' | 'agents' | 'high_risk_exceptions';
type RiskRating = 'low' | 'medium' | 'high';

interface ClientSegment {
  id: string;
  segment_type: SegmentType;
  segment_name: string;
  products_used: string[];
  geography_exposure: string[];
  key_risk_indicators: string[];
  inherent_risk_rating: RiskRating;
  prescribed_measures_applied: string | null;
  enhanced_monitoring_frequency: string | null;
  evidence_file_ids: string[];
}

const SEGMENT_TYPES = [
  { value: 'individual_clients', label: 'Individual Clients' },
  { value: 'business_clients', label: 'Business Clients' },
  { value: 'agents', label: 'Agents' },
  { value: 'high_risk_exceptions', label: 'High-Risk Exceptions' },
];

const RISK_RATINGS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const MONITORING_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'event_driven', label: 'Event-Driven' },
  { value: 'other', label: 'Other' },
];

export function ClientSegmentBuilder({ reviewId }: ClientSegmentBuilderProps) {
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSegments();
  }, [reviewId]);

  const loadSegments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rba_client_segments')
        .select('*')
        .eq('review_id', reviewId)
        .order('sort_order');

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('Error loading segments:', error);
      toast({ title: 'Error', description: 'Failed to load client segments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addSegment = async () => {
    try {
      const { data, error } = await supabase
        .from('rba_client_segments')
        .insert({
          review_id: reviewId,
          segment_type: 'individual_clients',
          segment_name: '',
          inherent_risk_rating: 'medium',
          products_used: [],
          geography_exposure: [],
          key_risk_indicators: [],
          sort_order: segments.length,
        })
        .select()
        .single();

      if (error) throw error;
      setSegments([...segments, data]);
    } catch (error) {
      console.error('Error adding segment:', error);
      toast({ title: 'Error', description: 'Failed to add client segment', variant: 'destructive' });
    }
  };

  const updateSegment = async (id: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('rba_client_segments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } as ClientSegment : s));
    } catch (error) {
      console.error('Error updating segment:', error);
      toast({ title: 'Error', description: 'Failed to update client segment', variant: 'destructive' });
    }
  };

  const deleteSegment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rba_client_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSegments(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Deleted', description: 'Client segment removed' });
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast({ title: 'Error', description: 'Failed to delete client segment', variant: 'destructive' });
    }
  };

  const highRiskWithoutMeasures = segments.filter(s => 
    s.inherent_risk_rating === 'high' && 
    (s.prescribed_measures_applied !== 'yes' || !s.enhanced_monitoring_frequency)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Build client segments or high-risk client inventory with enhanced measures documentation.
        </p>
        <Button onClick={addSegment} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Segment
        </Button>
      </div>

      {highRiskWithoutMeasures.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Flag:</strong> {highRiskWithoutMeasures.length} high-risk segment(s) missing prescribed measures or enhanced monitoring frequency.
          </AlertDescription>
        </Alert>
      )}

      {segments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No client segments added yet. Click "Add Segment" to begin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {segments.map((segment, index) => (
            <Card key={segment.id} className={segment.inherent_risk_rating === 'high' ? 'border-orange-300' : ''}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Segment #{index + 1}</span>
                    <Badge variant={segment.inherent_risk_rating === 'high' ? 'destructive' : segment.inherent_risk_rating === 'medium' ? 'secondary' : 'outline'}>
                      {segment.inherent_risk_rating}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteSegment(segment.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Segment Type</Label>
                    <Select
                      value={segment.segment_type}
                      onValueChange={(value) => updateSegment(segment.id, { segment_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Segment Name</Label>
                    <Input
                      value={segment.segment_name}
                      onChange={(e) => updateSegment(segment.id, { segment_name: e.target.value })}
                      placeholder="e.g., High-Value Remittance Clients"
                    />
                  </div>

                  <div>
                    <Label>Inherent Risk Rating</Label>
                    <Select
                      value={segment.inherent_risk_rating}
                      onValueChange={(value) => updateSegment(segment.id, { inherent_risk_rating: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_RATINGS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {segment.inherent_risk_rating === 'high' && (
                    <>
                      <div>
                        <Label>Prescribed Measures Applied?</Label>
                        <Select
                          value={segment.prescribed_measures_applied || ''}
                          onValueChange={(value) => updateSegment(segment.id, { prescribed_measures_applied: value })}
                        >
                          <SelectTrigger className={!segment.prescribed_measures_applied ? 'border-orange-300' : ''}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="na">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Enhanced Monitoring Frequency</Label>
                        <Select
                          value={segment.enhanced_monitoring_frequency || ''}
                          onValueChange={(value) => updateSegment(segment.id, { enhanced_monitoring_frequency: value })}
                        >
                          <SelectTrigger className={!segment.enhanced_monitoring_frequency ? 'border-orange-300' : ''}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MONITORING_FREQUENCIES.map(f => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label>Products Used (comma-separated)</Label>
                  <Input
                    value={segment.products_used?.join(', ') || ''}
                    onChange={(e) => updateSegment(segment.id, { 
                      products_used: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., Wire Transfer, FX, Bill Payment"
                  />
                </div>

                <div>
                  <Label>Geography Exposure (comma-separated)</Label>
                  <Input
                    value={segment.geography_exposure?.join(', ') || ''}
                    onChange={(e) => updateSegment(segment.id, { 
                      geography_exposure: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., Canada, USA, Mexico"
                  />
                </div>

                <div>
                  <Label>Key Risk Indicators (comma-separated)</Label>
                  <Input
                    value={segment.key_risk_indicators?.join(', ') || ''}
                    onChange={(e) => updateSegment(segment.id, { 
                      key_risk_indicators: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., High volume, Cash-intensive, Third-party involvement"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
