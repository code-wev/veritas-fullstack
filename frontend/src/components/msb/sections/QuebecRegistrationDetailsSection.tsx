import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Building, AlertCircle } from 'lucide-react';

interface QuebecRegistrationDetailsSectionProps {
  registration: any;
  onValidityChange?: (missing: string[]) => void;
}

// Per Revenu Québec MSB registry (https://www.revenuquebec.ca/.../register/)
const QC_AUTHORIZED_SERVICES = [
  'Currency exchange',
  'Funds transfer',
  "Issuing or redeeming traveller's cheques, money orders or bank drafts",
  'Cheque cashing',
  'Operation of automated teller machines',
  'Operation of cryptoasset automated teller machines',
];

const MANDATORY_FIELDS: { key: string; label: string }[] = [
  { key: 'msb_name', label: 'MSB Name' },
  { key: 'business_address', label: 'Business Address' },
  { key: 'qc_licence_number', label: 'Québec Licence Number' },
  { key: 'qc_authorized_services', label: 'Authorized Class of Services' },
];

const isFieldFilled = (value: any) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
};

export function QuebecRegistrationDetailsSection({ registration, onValidityChange }: QuebecRegistrationDetailsSectionProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    msb_name: registration.msb_name || '',
    business_address: registration.business_address || '',
    qc_licence_number: registration.qc_licence_number || '',
    qc_other_names: (registration.qc_other_names || []).join('\n'),
    qc_authorized_services: registration.qc_authorized_services || [],
    qc_mandataries: registration.qc_mandataries || '',
    qc_branches: registration.qc_branches || '',
    qc_atms: registration.qc_atms || '',
    qc_crypto_atms: registration.qc_crypto_atms || '',
    internal_notes: registration.internal_notes || '',
  });
  const [showErrors, setShowErrors] = useState(false);

  const missingFields = MANDATORY_FIELDS.filter(f => !isFieldFilled((formData as any)[f.key]));

  useEffect(() => {
    onValidityChange?.(missingFields.map(f => f.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(missingFields.map(f => f.key))]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const otherNamesArr = formData.qc_other_names
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('msb_registrations')
        .update({
          msb_name: formData.msb_name,
          business_address: formData.business_address,
          qc_licence_number: formData.qc_licence_number,
          qc_other_names: otherNamesArr,
          qc_authorized_services: formData.qc_authorized_services,
          qc_mandataries: formData.qc_mandataries,
          qc_branches: formData.qc_branches,
          qc_atms: formData.qc_atms,
          qc_crypto_atms: formData.qc_crypto_atms,
          internal_notes: formData.internal_notes,
          last_verified_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', registration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-registration'] });
      if (missingFields.length === 0) toast.success('Quebec registration details saved');
      else toast.success(`Saved. ${missingFields.length} mandatory field${missingFields.length > 1 ? 's' : ''} still empty.`);
    },
    onError: (err) => toast.error('Save failed: ' + err.message),
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (svc: string) => {
    const current: string[] = formData.qc_authorized_services;
    handleChange(
      'qc_authorized_services',
      current.includes(svc) ? current.filter((s) => s !== svc) : [...current, svc],
    );
  };

  const handleSave = () => {
    setShowErrors(true);
    updateMutation.mutate();
  };

  const isMissing = (key: string) => showErrors && !isFieldFilled((formData as any)[key]);
  const requiredMark = <span className="text-destructive ml-0.5">*</span>;
  const errorRing = (key: string) => (isMissing(key) ? 'border-destructive focus-visible:ring-destructive' : '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Detail of Registration — Revenu Québec
        </CardTitle>
        <CardDescription>
          Capture the limited registry fields published by Revenu Québec for this MSB.
          Fields marked <span className="text-destructive font-semibold">*</span> are required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showErrors && missingFields.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">{missingFields.length} mandatory field{missingFields.length > 1 ? 's' : ''} still empty</p>
              <p className="text-muted-foreground text-xs mt-1">{missingFields.map(f => f.label).join(' · ')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="msb_name">Name{requiredMark}</Label>
            <Input
              id="msb_name"
              value={formData.msb_name}
              onChange={(e) => handleChange('msb_name', e.target.value)}
              placeholder="Legal entity name as per registry"
              className={errorRing('msb_name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc_licence_number">Licence Number{requiredMark}</Label>
            <Input
              id="qc_licence_number"
              value={formData.qc_licence_number}
              onChange={(e) => handleChange('qc_licence_number', e.target.value)}
              placeholder="e.g., 10552"
              className={errorRing('qc_licence_number')}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="business_address">Address{requiredMark}</Label>
            <Textarea
              id="business_address"
              value={formData.business_address}
              onChange={(e) => handleChange('business_address', e.target.value)}
              placeholder="Full registered address"
              rows={2}
              className={errorRing('business_address')}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="qc_other_names">Other Names</Label>
            <Textarea
              id="qc_other_names"
              value={formData.qc_other_names}
              onChange={(e) => handleChange('qc_other_names', e.target.value)}
              placeholder="One trade name / DBA per line"
              rows={3}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">
            Authorized Class of Services{requiredMark}
            {isMissing('qc_authorized_services') && (
              <span className="ml-2 text-xs text-destructive font-normal">Select at least one service</span>
            )}
          </h4>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-md ${isMissing('qc_authorized_services') ? 'border border-destructive' : ''}`}>
            {QC_AUTHORIZED_SERVICES.map((svc) => (
              <label key={svc} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.qc_authorized_services.includes(svc)}
                  onChange={() => toggleService(svc)}
                  className="rounded border-input"
                />
                <span className="text-sm">{svc}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qc_mandataries">Is a Mandatary of</Label>
            <Textarea
              id="qc_mandataries"
              value={formData.qc_mandataries}
              onChange={(e) => handleChange('qc_mandataries', e.target.value)}
              placeholder='Enter "None" if not applicable'
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc_branches">Branches</Label>
            <Textarea
              id="qc_branches"
              value={formData.qc_branches}
              onChange={(e) => handleChange('qc_branches', e.target.value)}
              placeholder='Enter "None" if not applicable'
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc_atms">Automated Teller Machines</Label>
            <Textarea
              id="qc_atms"
              value={formData.qc_atms}
              onChange={(e) => handleChange('qc_atms', e.target.value)}
              placeholder='Enter "None" or list ATM identifiers/locations'
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc_crypto_atms">Cryptoasset Automated Teller Machines</Label>
            <Textarea
              id="qc_crypto_atms"
              value={formData.qc_crypto_atms}
              onChange={(e) => handleChange('qc_crypto_atms', e.target.value)}
              placeholder='Enter "None" or list crypto-ATM identifiers/locations'
              rows={2}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Internal Notes</h4>
          <Textarea
            value={formData.internal_notes}
            onChange={(e) => handleChange('internal_notes', e.target.value)}
            placeholder="Add any internal review notes..."
            rows={3}
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
