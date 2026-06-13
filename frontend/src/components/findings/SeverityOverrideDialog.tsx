import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface SeverityOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSeverity: string;
  originalSeverity: string | null | undefined;
  onConfirm: (newSeverity: string, reason: string) => void;
}

export function SeverityOverrideDialog({
  open,
  onOpenChange,
  currentSeverity,
  originalSeverity,
  onConfirm
}: SeverityOverrideDialogProps) {
  const [newSeverity, setNewSeverity] = useState(currentSeverity);
  const [reason, setReason] = useState('');

  const isDowngrade = (from: string, to: string) => {
    const order = ['high', 'medium', 'low'];
    return order.indexOf(to) > order.indexOf(from);
  };

  const showDowngradeWarning = originalSeverity 
    ? isDowngrade(originalSeverity, newSeverity)
    : isDowngrade(currentSeverity, newSeverity);

  const handleConfirm = () => {
    if (newSeverity !== currentSeverity && reason.trim()) {
      onConfirm(newSeverity, reason);
      setReason('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNewSeverity(currentSeverity);
      setReason('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Severity Rating</DialogTitle>
          <DialogDescription>
            Severity governance is owned by the Findings module. Changes require justification and are tracked in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Current Severity</Label>
            <Badge 
              variant={currentSeverity === 'high' ? 'destructive' : currentSeverity === 'medium' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {currentSeverity.toUpperCase()}
            </Badge>
            {originalSeverity && originalSeverity !== currentSeverity && (
              <p className="text-xs text-muted-foreground">
                Original auto-rating: {originalSeverity}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>New Severity</Label>
            <RadioGroup value={newSeverity} onValueChange={setNewSeverity}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="cursor-pointer">
                  <Badge variant="destructive">HIGH</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer">
                  <Badge variant="default">MEDIUM</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="cursor-pointer">
                  <Badge variant="secondary">LOW</Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {showDowngradeWarning && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Downgrade Warning</p>
                <p className="text-muted-foreground">
                  You are downgrading the severity. A detailed justification is required and will be recorded in the audit trail.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Justification *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide detailed justification for this severity change..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={newSeverity === currentSeverity || !reason.trim()}
          >
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
