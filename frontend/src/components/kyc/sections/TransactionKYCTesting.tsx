import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, CheckCircle, XCircle, Edit, AlertTriangle } from 'lucide-react';

interface TransactionKYCTestingProps {
  reviewId: string;
  onIssueCreated: () => void;
}

interface TransactionSample {
  id: string;
  transaction_id: string | null;
  transaction_date: string | null;
  transaction_type: string | null;
  transaction_amount: number | null;
  currency: string | null;
  linked_customer_id: string | null;
  linked_customer_name: string | null;
  customer_risk_rating: string | null;
  occupation_required: boolean | null;
  occupation_obtained: boolean | null;
  third_party_required: boolean | null;
  third_party_documented: boolean | null;
  eft_record_complete: boolean | null;
  vc_record_complete: boolean | null;
  lctr_record_complete: boolean | null;
  kyc_file_linked: boolean | null;
  kyc_file_current: boolean | null;
  test_result: string | null;
  deficiencies: string | null;
  notes: string | null;
}

const emptyTransactionSample: Partial<TransactionSample> = {
  transaction_id: '',
  transaction_date: '',
  transaction_type: null,
  transaction_amount: null,
  currency: 'CAD',
  linked_customer_id: '',
  linked_customer_name: '',
  customer_risk_rating: null,
  occupation_required: false,
  occupation_obtained: null,
  third_party_required: false,
  third_party_documented: null,
  eft_record_complete: null,
  vc_record_complete: null,
  lctr_record_complete: null,
  kyc_file_linked: null,
  kyc_file_current: null,
  deficiencies: '',
  notes: '',
};

const transactionTypes = [
  { value: 'vc_transaction', label: 'Virtual Currency ≥$10,000' },
  { value: 'eft', label: 'EFT ≥$1,000' },
  { value: 'remittance', label: 'Remittance ≥$1,000' },
  { value: 'non_eft_transmission', label: 'Non-EFT Transmission ≥$1,000' },
  { value: 'lctr', label: 'Large Cash Transaction' },
  { value: 'other', label: 'Other' },
];

export function TransactionKYCTesting({ reviewId, onIssueCreated }: TransactionKYCTestingProps) {
  const [samples, setSamples] = useState<TransactionSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<TransactionSample | null>(null);
  const [formData, setFormData] = useState<Partial<TransactionSample>>(emptyTransactionSample);
  const { toast } = useToast();

  useEffect(() => {
    loadSamples();
  }, [reviewId]);

  const loadSamples = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kyc_transaction_samples')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSamples(data || []);
    }
    setLoading(false);
  };

  const calculateTestResult = (data: Partial<TransactionSample>) => {
    const issues: string[] = [];

    // Check occupation if required (transaction ≥$1,000)
    if (data.occupation_required && data.occupation_obtained === false) {
      issues.push('Occupation not obtained for transaction ≥$1,000');
    }

    // Check third-party documentation
    if (data.third_party_required && data.third_party_documented === false) {
      issues.push('Third-party not documented');
    }

    // Check record completeness based on transaction type
    if (data.transaction_type === 'eft' && data.eft_record_complete === false) {
      issues.push('EFT record incomplete');
    }
    if (data.transaction_type === 'vc_transaction' && data.vc_record_complete === false) {
      issues.push('VC transaction record incomplete');
    }
    if (data.transaction_type === 'lctr' && data.lctr_record_complete === false) {
      issues.push('LCTR record incomplete');
    }

    // Check KYC linkage
    if (data.kyc_file_linked === false) {
      issues.push('Transaction not linked to KYC file');
    }

    if (issues.length === 0) {
      // Check if all relevant fields are answered
      const hasAnswers = data.kyc_file_linked !== null;
      return hasAnswers ? 'pass' : 'pending';
    } else if (issues.length <= 2) {
      return 'partial';
    } else {
      return 'fail';
    }
  };

  const generateAutoIssues = async (sample: TransactionSample) => {
    const issues: any[] = [];
    const txnRef = sample.transaction_id || 'Unknown';

    // Occupation requirement for transactions ≥$1,000
    if (sample.occupation_required && sample.occupation_obtained === false) {
      issues.push({
        review_id: reviewId,
        transaction_sample_id: sample.id,
        issue_category: 'transaction_records',
        issue_title: 'Occupation Not Obtained for Transaction ≥$1,000',
        issue_description: `Transaction ${txnRef} triggered occupation requirement but occupation was not obtained.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: Occupation for transaction ≥$1,000',
        recommendation: 'Obtain and document occupation in accordance with PCMLTFR for transactions ≥$1,000.',
      });
    }

    // Third-party documentation
    if (sample.third_party_required && sample.third_party_documented === false) {
      issues.push({
        review_id: reviewId,
        transaction_sample_id: sample.id,
        issue_category: 'transaction_records',
        issue_title: 'Third-Party Not Documented',
        issue_description: `Transaction ${txnRef} involved a third party but third-party determination not documented.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: Third-party documentation',
        recommendation: 'Document third-party relationship for applicable transactions.',
      });
    }

    // EFT record completeness
    if (sample.transaction_type === 'eft' && sample.eft_record_complete === false) {
      issues.push({
        review_id: reviewId,
        transaction_sample_id: sample.id,
        issue_category: 'transaction_records',
        issue_title: 'Incomplete EFT Record',
        issue_description: `EFT transaction ${txnRef} has incomplete record documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: Complete EFT records',
        recommendation: 'Ensure all required EFT record fields are documented per PCMLTFR.',
      });
    }

    // VC transaction record completeness
    if (sample.transaction_type === 'vc_transaction' && sample.vc_record_complete === false) {
      issues.push({
        review_id: reviewId,
        transaction_sample_id: sample.id,
        issue_category: 'transaction_records',
        issue_title: 'Incomplete VC Transaction Record',
        issue_description: `Virtual currency transaction ${txnRef} has incomplete record documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: Complete VC transaction records',
        recommendation: 'Ensure all required VC transaction record fields are documented per PCMLTFR.',
      });
    }

    // LCTR record completeness
    if (sample.transaction_type === 'lctr' && sample.lctr_record_complete === false) {
      issues.push({
        review_id: reviewId,
        transaction_sample_id: sample.id,
        issue_category: 'transaction_records',
        issue_title: 'Incomplete Large Cash Transaction Record',
        issue_description: `Large cash transaction ${txnRef} has incomplete record documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: Complete LCTR records',
        recommendation: 'Ensure all required large cash transaction record fields are documented per PCMLTFR.',
      });
    }

    // KYC file linkage
    if (sample.kyc_file_linked === false) {
      issues.push({
        review_id: reviewId,
        transaction_sample_id: sample.id,
        issue_category: 'transaction_records',
        issue_title: 'Transaction Not Linked to KYC File',
        issue_description: `Transaction ${txnRef} is not linked to a client KYC file.`,
        severity: 'medium',
        is_auto_generated: true,
        auto_flag_reason: 'Transaction not linked to KYC',
        recommendation: 'Ensure all transactions are linked to corresponding client KYC files.',
      });
    }

    if (issues.length > 0) {
      await supabase
        .from('kyc_issues')
        .delete()
        .eq('transaction_sample_id', sample.id)
        .eq('is_auto_generated', true);

      const { error } = await supabase.from('kyc_issues').insert(issues);
      if (error) {
        toast({ title: 'Warning', description: 'Failed to create some auto-issues', variant: 'destructive' });
      } else {
        onIssueCreated();
      }
    }
  };

  const saveSample = async () => {
    const testResult = calculateTestResult(formData);
    const dataToSave = {
      ...formData,
      test_result: testResult,
      review_id: reviewId,
      // Convert empty strings to null for date fields
      transaction_date: formData.transaction_date || null,
    };

    try {
      let savedSample: TransactionSample;

      if (editingSample) {
        const { data, error } = await supabase
          .from('kyc_transaction_samples')
          .update(dataToSave as any)
          .eq('id', editingSample.id)
          .select()
          .single();

        if (error) throw error;
        savedSample = data as TransactionSample;
      } else {
        const { data, error } = await supabase
          .from('kyc_transaction_samples')
          .insert(dataToSave as any)
          .select()
          .single();

        if (error) throw error;
        savedSample = data as TransactionSample;
      }

      await generateAutoIssues(savedSample);

      toast({ title: 'Saved', description: 'Sample saved successfully.' });
      setDialogOpen(false);
      setEditingSample(null);
      setFormData(emptyTransactionSample);
      loadSamples();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteSample = async (id: string) => {
    const { error } = await supabase.from('kyc_transaction_samples').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Sample removed.' });
      loadSamples();
      onIssueCreated();
    }
  };

  const openEditDialog = (sample: TransactionSample) => {
    setEditingSample(sample);
    setFormData(sample);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingSample(null);
    setFormData(emptyTransactionSample);
    setDialogOpen(true);
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'pass':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fail</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency || 'CAD',
    }).format(amount);
  };

  // Auto-set occupation_required based on amount
  useEffect(() => {
    if (formData.transaction_amount && formData.transaction_amount >= 1000) {
      setFormData(prev => ({ ...prev, occupation_required: true }));
    }
  }, [formData.transaction_amount]);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Transaction-Triggered KYC Testing</h2>
          <p className="text-sm text-muted-foreground">Test transaction records and KYC linkage per FINTRAC requirements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sample
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSample ? 'Edit' : 'Add'} Transaction Sample</DialogTitle>
              <DialogDescription>
                Test transaction-triggered KYC requirements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Transaction Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Transaction Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input
                      value={formData.transaction_id || ''}
                      onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                      placeholder="Transaction reference"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction Date</Label>
                    <Input
                      type="date"
                      value={formData.transaction_date || ''}
                      onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <Select
                      value={formData.transaction_type || ''}
                      onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={formData.transaction_amount || ''}
                      onChange={(e) => setFormData({ ...formData, transaction_amount: parseFloat(e.target.value) || null })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency || 'CAD'}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Linked Client */}
              <div className="space-y-4">
                <h4 className="font-medium">Linked Client</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Customer ID</Label>
                    <Input
                      value={formData.linked_customer_id || ''}
                      onChange={(e) => setFormData({ ...formData, linked_customer_id: e.target.value })}
                      placeholder="Client identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input
                      value={formData.linked_customer_name || ''}
                      onChange={(e) => setFormData({ ...formData, linked_customer_name: e.target.value })}
                      placeholder="Client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Risk Rating</Label>
                    <Select
                      value={formData.customer_risk_rating || ''}
                      onValueChange={(value) => setFormData({ ...formData, customer_risk_rating: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Triggered Obligations */}
              <div className="space-y-4">
                <h4 className="font-medium">Triggered Obligations</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="occupation_required"
                        checked={formData.occupation_required === true}
                        onCheckedChange={(checked) => setFormData({ ...formData, occupation_required: checked === true })}
                      />
                      <Label htmlFor="occupation_required" className="font-medium">Occupation required (≥$1,000)</Label>
                    </div>
                    {formData.occupation_required && (
                      <div className="flex items-center space-x-2 ml-6">
                        <Checkbox
                          id="occupation_obtained"
                          checked={formData.occupation_obtained === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, occupation_obtained: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="occupation_obtained">Occupation obtained</Label>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="third_party_required"
                        checked={formData.third_party_required === true}
                        onCheckedChange={(checked) => setFormData({ ...formData, third_party_required: checked === true })}
                      />
                      <Label htmlFor="third_party_required" className="font-medium">Third-party involved</Label>
                    </div>
                    {formData.third_party_required && (
                      <div className="flex items-center space-x-2 ml-6">
                        <Checkbox
                          id="third_party_documented"
                          checked={formData.third_party_documented === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, third_party_documented: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="third_party_documented">Third-party documented</Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Record Completeness */}
              <div className="space-y-4">
                <h4 className="font-medium">Record Completeness</h4>
                <div className="grid grid-cols-2 gap-4">
                  {(formData.transaction_type === 'eft' || formData.transaction_type === 'remittance' || formData.transaction_type === 'non_eft_transmission') && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="eft_record_complete"
                        checked={formData.eft_record_complete === true}
                        onCheckedChange={(checked) => setFormData({ ...formData, eft_record_complete: checked === true ? true : checked === false ? false : null })}
                      />
                      <Label htmlFor="eft_record_complete">EFT record complete</Label>
                    </div>
                  )}
                  {formData.transaction_type === 'vc_transaction' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="vc_record_complete"
                        checked={formData.vc_record_complete === true}
                        onCheckedChange={(checked) => setFormData({ ...formData, vc_record_complete: checked === true ? true : checked === false ? false : null })}
                      />
                      <Label htmlFor="vc_record_complete">VC transaction record complete</Label>
                    </div>
                  )}
                  {formData.transaction_type === 'lctr' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="lctr_record_complete"
                        checked={formData.lctr_record_complete === true}
                        onCheckedChange={(checked) => setFormData({ ...formData, lctr_record_complete: checked === true ? true : checked === false ? false : null })}
                      />
                      <Label htmlFor="lctr_record_complete">LCTR record complete</Label>
                    </div>
                  )}
                </div>
              </div>

              {/* KYC Linkage */}
              <div className="space-y-4">
                <h4 className="font-medium">KYC Linkage</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kyc_file_linked"
                      checked={formData.kyc_file_linked === true}
                      onCheckedChange={(checked) => setFormData({ ...formData, kyc_file_linked: checked === true ? true : checked === false ? false : null })}
                    />
                    <Label htmlFor="kyc_file_linked">KYC file linked</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kyc_file_current"
                      checked={formData.kyc_file_current === true}
                      onCheckedChange={(checked) => setFormData({ ...formData, kyc_file_current: checked === true ? true : checked === false ? false : null })}
                    />
                    <Label htmlFor="kyc_file_current">KYC file current</Label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Deficiencies / Notes</Label>
                <Textarea
                  value={formData.deficiencies || ''}
                  onChange={(e) => setFormData({ ...formData, deficiencies: e.target.value })}
                  placeholder="Document any deficiencies or observations..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveSample}>Save Sample</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="pt-6">
          {samples.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transaction samples yet. Click "Add Sample" to begin testing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">{sample.transaction_id || 'N/A'}</TableCell>
                    <TableCell>{sample.transaction_date || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transactionTypes.find(t => t.value === sample.transaction_type)?.label || sample.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatAmount(sample.transaction_amount, sample.currency)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{sample.linked_customer_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{sample.linked_customer_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getResultBadge(sample.test_result)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(sample)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSample(sample.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
