import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RiskFactorInventoryProps {
  reviewId: string;
}

type RiskFactorCategory = 'products_services' | 'delivery_channels' | 'geography' | 'technology' | 'third_parties' | 'other';
type RiskRating = 'low' | 'medium' | 'high';

interface RiskFactor {
  id: string;
  category: RiskFactorCategory;
  risk_factor_name: string;
  inherent_risk_rating: RiskRating;
  rationale: string | null;
  existing_controls: string | null;
  residual_risk_rating: RiskRating | null;
  is_high_risk: boolean;
  evidence_file_ids: string[];
  evidence_url: string | null;
}

const CATEGORIES = [
  { value: 'products_services', label: 'Products and Services' },
  { value: 'delivery_channels', label: 'Delivery Channels' },
  { value: 'geography', label: 'Geography' },
  { value: 'technology', label: 'Technology' },
  { value: 'third_parties', label: 'Third Parties' },
  { value: 'other', label: 'Other' },
];

const RISK_RATINGS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function RiskFactorInventory({ reviewId }: RiskFactorInventoryProps) {
  const [factors, setFactors] = useState<RiskFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFactors();
  }, [reviewId]);

  const loadFactors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rba_risk_factors')
        .select('*')
        .eq('review_id', reviewId)
        .order('sort_order');

      if (error) throw error;
      setFactors(data || []);
    } catch (error) {
      console.error('Error loading factors:', error);
      toast({ title: 'Error', description: 'Failed to load risk factors', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addFactor = async () => {
    try {
      const { data, error } = await supabase
        .from('rba_risk_factors')
        .insert({
          review_id: reviewId,
          category: 'products_services',
          risk_factor_name: '',
          inherent_risk_rating: 'medium',
          is_high_risk: false,
          sort_order: factors.length,
        })
        .select()
        .single();

      if (error) throw error;
      setFactors([...factors, data]);
    } catch (error) {
      console.error('Error adding factor:', error);
      toast({ title: 'Error', description: 'Failed to add risk factor', variant: 'destructive' });
    }
  };

  const updateFactor = async (id: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('rba_risk_factors')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setFactors(prev => prev.map(f => f.id === id ? { ...f, ...updates } as RiskFactor : f));
    } catch (error) {
      console.error('Error updating factor:', error);
      toast({ title: 'Error', description: 'Failed to update risk factor', variant: 'destructive' });
    }
  };

  const deleteFactor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rba_risk_factors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFactors(prev => prev.filter(f => f.id !== id));
      toast({ title: 'Deleted', description: 'Risk factor removed' });
    } catch (error) {
      console.error('Error deleting factor:', error);
      toast({ title: 'Error', description: 'Failed to delete risk factor', variant: 'destructive' });
    }
  };

  const highRiskWithoutControls = factors.filter(f => 
    f.is_high_risk && f.residual_risk_rating === 'high' && !f.existing_controls
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
          Capture structured risk factors with rating and rationale for audit evidence.
        </p>
        <Button onClick={addFactor} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Risk Factor
        </Button>
      </div>

      {highRiskWithoutControls.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Flag:</strong> {highRiskWithoutControls.length} high-risk factor(s) with high residual risk and no documented controls.
          </AlertDescription>
        </Alert>
      )}

      {factors.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No risk factors added yet. Click "Add Risk Factor" to begin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {factors.map((factor, index) => (
            <Card key={factor.id} className={factor.is_high_risk ? 'border-orange-300' : ''}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Risk Factor #{index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteFactor(factor.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={factor.category}
                      onValueChange={(value) => updateFactor(factor.id, { category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Risk Factor Name</Label>
                    <Input
                      value={factor.risk_factor_name}
                      onChange={(e) => updateFactor(factor.id, { risk_factor_name: e.target.value })}
                      placeholder="e.g., International Wire Transfers"
                    />
                  </div>

                  <div>
                    <Label>Inherent Risk Rating</Label>
                    <Select
                      value={factor.inherent_risk_rating}
                      onValueChange={(value) => updateFactor(factor.id, { inherent_risk_rating: value })}
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

                  <div>
                    <Label>Residual Risk Rating</Label>
                    <Select
                      value={factor.residual_risk_rating || ''}
                      onValueChange={(value) => updateFactor(factor.id, { residual_risk_rating: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_RATINGS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Rationale</Label>
                  <Textarea
                    value={factor.rationale || ''}
                    onChange={(e) => updateFactor(factor.id, { rationale: e.target.value })}
                    placeholder="Document the rationale for the risk rating..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`high_risk_${factor.id}`}
                    checked={factor.is_high_risk}
                    onCheckedChange={(checked) => updateFactor(factor.id, { is_high_risk: !!checked })}
                  />
                  <Label htmlFor={`high_risk_${factor.id}`}>This is a high-risk element</Label>
                </div>

                {factor.is_high_risk && (
                  <div>
                    <Label>Existing Controls (Required for High-Risk)</Label>
                    <Textarea
                      value={factor.existing_controls || ''}
                      onChange={(e) => updateFactor(factor.id, { existing_controls: e.target.value })}
                      placeholder="Document existing controls that mitigate this risk..."
                      rows={2}
                      className={!factor.existing_controls ? 'border-orange-300' : ''}
                    />
                    {!factor.existing_controls && (
                      <p className="text-xs text-orange-600 mt-1">Controls are required for high-risk elements</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Evidence Link or URL</Label>
                  <Input
                    value={factor.evidence_url || ''}
                    onChange={(e) => updateFactor(factor.id, { evidence_url: e.target.value })}
                    placeholder="Link to supporting evidence"
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
