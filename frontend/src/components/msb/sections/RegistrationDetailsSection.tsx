import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Building, AlertCircle } from 'lucide-react';

interface RegistrationDetailsSectionProps {
  registration: any;
  registrationType: 'fintrac' | 'revenu_quebec';
  onValidityChange?: (missing: string[]) => void;
}

const MSB_ACTIVITIES = [
  'Foreign exchange dealing',
  'Remitting/transferring funds',
  'Issuing/redeeming money orders',
  "Issuing/redeeming traveller's cheques",
  'Dealing in virtual currency',
  'Payment service provider',
  'Crowdfunding platform services',
  'Armoured cars',
  'Cheque cashers',
  'Acquirer services in relation to private automated banking machines',
];

// Mandatory fields per user spec
const MANDATORY_FIELDS: { key: string; label: string }[] = [
  { key: 'msb_name', label: 'MSB Name' },
  { key: 'msb_status', label: 'MSB Status' },
  { key: 'registration_number', label: 'MSB Registration Number' },
  { key: 'initial_registration_date', label: 'Initial Date of Registration' },
  { key: 'expiry_date', label: 'Expiry Date of Registration' },
  { key: 'compliance_officer_name', label: 'Compliance Officer Name' },
  { key: 'business_address', label: 'Business Address' },
  { key: 'msb_activities', label: 'MSB Activities' },
  { key: 'channel_of_delivery', label: 'Channel of Delivery' },
];

const isFieldFilled = (value: any) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
};

export function RegistrationDetailsSection({ registration, registrationType, onValidityChange }: RegistrationDetailsSectionProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    msb_name: registration.msb_name || '',
    registration_number: registration.registration_number || '',
    trade_name: registration.trade_name || '',
    msb_status: registration.msb_status || '',
    initial_registration_date: registration.initial_registration_date || '',
    expiry_date: registration.expiry_date || '',
    incorporation_number: registration.incorporation_number || '',
    date_of_incorporation: registration.date_of_incorporation || '',
    jurisdiction_of_incorporation: registration.jurisdiction_of_incorporation || '',
    business_address: registration.business_address || '',
    website_address: registration.website_address || '',
    compliance_officer_name: registration.compliance_officer_name || '',
    msb_activities: registration.msb_activities || [],
    agency_locations: registration.agency_locations || '',
    channel_of_delivery: registration.channel_of_delivery || '',
    internal_notes: registration.internal_notes || '',
  });
  const [showErrors, setShowErrors] = useState(false);

  const missingFields = MANDATORY_FIELDS.filter(f => !isFieldFilled((formData as any)[f.key]));

  useEffect(() => {
    onValidityChange?.(missingFields.map(f => f.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(missingFields.map(f => f.key))]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('msb_registrations')
        .update({
          ...data,
          last_verified_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', registration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-registration'] });
      if (missingFields.length === 0) {
        toast.success('Registration details saved');
      } else {
        toast.success(`Saved. ${missingFields.length} mandatory field${missingFields.length > 1 ? 's' : ''} still empty.`);
      }
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleActivityToggle = (activity: string) => {
    const current = formData.msb_activities;
    const updated = current.includes(activity)
      ? current.filter((a: string) => a !== activity)
      : [...current, activity];
    handleChange('msb_activities', updated);
  };

  const handleSave = () => {
    setShowErrors(true);
    const cleanedData = {
      ...formData,
      initial_registration_date: formData.initial_registration_date || null,
      expiry_date: formData.expiry_date || null,
      date_of_incorporation: formData.date_of_incorporation || null,
      msb_status: formData.msb_status || null,
    };
    updateMutation.mutate(cleanedData);
  };

  const isMissing = (key: string) => showErrors && !isFieldFilled((formData as any)[key]);
  const requiredMark = <span className="text-destructive ml-0.5">*</span>;
  const errorRing = (key: string) => (isMissing(key) ? 'border-destructive focus-visible:ring-destructive' : '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Detail of Registration
        </CardTitle>
        <CardDescription>
          Capture key registration fields as structured data from {registrationType === 'fintrac' ? 'FINTRAC' : 'Revenu Québec'}.
          Fields marked <span className="text-destructive font-semibold">*</span> are required before moving to the audit checklist.
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

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="msb_name">MSB Name{requiredMark}</Label>
            <Input
              id="msb_name"
              value={formData.msb_name}
              onChange={(e) => handleChange('msb_name', e.target.value)}
              placeholder="Enter MSB legal name"
              className={errorRing('msb_name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="msb_status">MSB Status{requiredMark}</Label>
            <Select
              value={formData.msb_status}
              onValueChange={(value) => handleChange('msb_status', value)}
            >
              <SelectTrigger className={errorRing('msb_status')}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="ceased">Ceased</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_number">MSB Registration Number{requiredMark}</Label>
            <Input
              id="registration_number"
              value={formData.registration_number}
              onChange={(e) => handleChange('registration_number', e.target.value)}
              placeholder="M12345678"
              className={errorRing('registration_number')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trade_name">Trade Name</Label>
            <Input
              id="trade_name"
              value={formData.trade_name}
              onChange={(e) => handleChange('trade_name', e.target.value)}
              placeholder="DBA or operating name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_registration_date">Initial Date of Registration{requiredMark}</Label>
            <Input
              id="initial_registration_date"
              type="date"
              value={formData.initial_registration_date}
              onChange={(e) => handleChange('initial_registration_date', e.target.value)}
              className={errorRing('initial_registration_date')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website_address">Website Address</Label>
            <Input
              id="website_address"
              value={formData.website_address}
              onChange={(e) => handleChange('website_address', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date of Registration{requiredMark}</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => handleChange('expiry_date', e.target.value)}
              className={errorRing('expiry_date')}
            />
          </div>
        </div>

        {/* Incorporation Details */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Incorporation Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incorporation_number">Incorporation Number</Label>
              <Input
                id="incorporation_number"
                value={formData.incorporation_number}
                onChange={(e) => handleChange('incorporation_number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_incorporation">Date of Incorporation</Label>
              <Input
                id="date_of_incorporation"
                type="date"
                value={formData.date_of_incorporation}
                onChange={(e) => handleChange('date_of_incorporation', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction_of_incorporation">Jurisdiction of Incorporation</Label>
              <Input
                id="jurisdiction_of_incorporation"
                value={formData.jurisdiction_of_incorporation}
                onChange={(e) => handleChange('jurisdiction_of_incorporation', e.target.value)}
                placeholder="e.g., Ontario, Federal"
              />
            </div>
          </div>
        </div>

        {/* Address and Contact */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Address & Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_address">Business Address{requiredMark}</Label>
              <Textarea
                id="business_address"
                value={formData.business_address}
                onChange={(e) => handleChange('business_address', e.target.value)}
                placeholder="Full business address"
                rows={2}
                className={errorRing('business_address')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance_officer_name">Compliance Officer Name{requiredMark}</Label>
              <Input
                id="compliance_officer_name"
                value={formData.compliance_officer_name}
                onChange={(e) => handleChange('compliance_officer_name', e.target.value)}
                className={errorRing('compliance_officer_name')}
              />
            </div>
          </div>
        </div>

        {/* MSB Activities */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">
            MSB Activities{requiredMark}
            {isMissing('msb_activities') && (
              <span className="ml-2 text-xs text-destructive font-normal">Select at least one activity</span>
            )}
          </h4>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-md ${isMissing('msb_activities') ? 'border border-destructive' : ''}`}>
            {MSB_ACTIVITIES.map((activity) => (
              <label key={activity} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.msb_activities.includes(activity)}
                  onChange={() => handleActivityToggle(activity)}
                  className="rounded border-input"
                />
                <span className="text-sm">{activity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Operations */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Operations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency_locations">Agency Location(s)</Label>
              <Textarea
                id="agency_locations"
                value={formData.agency_locations}
                onChange={(e) => handleChange('agency_locations', e.target.value)}
                placeholder="List of agent or branch locations"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel_of_delivery">Channel of Delivery{requiredMark}</Label>
              <Input
                id="channel_of_delivery"
                value={formData.channel_of_delivery}
                onChange={(e) => handleChange('channel_of_delivery', e.target.value)}
                placeholder="e.g., In-person, Online, Both"
                className={errorRing('channel_of_delivery')}
              />
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Internal Notes</h4>
          <Textarea
            value={formData.internal_notes}
            onChange={(e) => handleChange('internal_notes', e.target.value)}
            placeholder="Add any internal review notes..."
            rows={3}
          />
        </div>

        {/* Save Button */}
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
