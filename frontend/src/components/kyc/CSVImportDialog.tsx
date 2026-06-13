import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, User, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CSVImportDialogProps {
  reviewId: string;
  onImportComplete: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

type ImportType = 'individual' | 'business';

const INDIVIDUAL_COLUMNS = [
  { key: 'customer_id', label: 'Customer ID', required: false },
  { key: 'customer_name', label: 'Customer Name', required: true },
  { key: 'onboarding_date', label: 'Onboarding Date', required: false },
  { key: 'risk_rating', label: 'Risk Rating', required: false },
];

const BUSINESS_COLUMNS = [
  { key: 'customer_id', label: 'Customer ID', required: false },
  { key: 'business_name', label: 'Business Name', required: true },
  { key: 'onboarding_date', label: 'Onboarding Date', required: false },
  { key: 'risk_rating', label: 'Risk Rating', required: false },
];

export function CSVImportDialog({ reviewId, onImportComplete }: CSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<ImportType>('individual');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const columns = importType === 'individual' ? INDIVIDUAL_COLUMNS : BUSINESS_COLUMNS;
  const tableName = importType === 'individual' ? 'kyc_individual_samples' : 'kyc_business_samples';
  const nameField = importType === 'individual' ? 'customer_name' : 'business_name';

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    
    const data: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: ParsedRow = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        data.push(row);
      }
    }
    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        
        if (data.length === 0) {
          setError('No data found in the CSV file. Make sure it has a header row and at least one data row.');
          return;
        }

        setParsedData(data);
        autoMapColumns(data);
      } catch (err) {
        setError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const autoMapColumns = (data: ParsedRow[]) => {
    const csvHeaders = Object.keys(data[0]);
    const mapping: Record<string, string> = {};
    
    columns.forEach(col => {
      const matchingHeader = csvHeaders.find(h => 
        h.toLowerCase().replace(/[_\s]/g, '').includes(col.key.toLowerCase().replace(/[_\s]/g, '')) ||
        h.toLowerCase().replace(/[_\s]/g, '').includes(col.label.toLowerCase().replace(/[_\s]/g, ''))
      );
      if (matchingHeader) {
        mapping[col.key] = matchingHeader;
      }
    });

    setColumnMapping(mapping);
  };

  const handleTypeChange = (type: ImportType) => {
    setImportType(type);
    // Re-map columns when type changes
    if (parsedData.length > 0) {
      const newColumns = type === 'individual' ? INDIVIDUAL_COLUMNS : BUSINESS_COLUMNS;
      const csvHeaders = Object.keys(parsedData[0]);
      const mapping: Record<string, string> = {};
      
      newColumns.forEach(col => {
        const matchingHeader = csvHeaders.find(h => 
          h.toLowerCase().replace(/[_\s]/g, '').includes(col.key.toLowerCase().replace(/[_\s]/g, '')) ||
          h.toLowerCase().replace(/[_\s]/g, '').includes(col.label.toLowerCase().replace(/[_\s]/g, ''))
        );
        if (matchingHeader) {
          mapping[col.key] = matchingHeader;
        }
      });

      setColumnMapping(mapping);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const records = parsedData.map(row => {
        const record: Record<string, any> = {
          review_id: reviewId,
          risk_rating: 'low',
        };

        Object.entries(columnMapping).forEach(([dbField, csvColumn]) => {
          if (csvColumn && row[csvColumn]) {
            let value: any = row[csvColumn];
            
            if (dbField === 'risk_rating') {
              const normalized = value.toLowerCase().trim();
              if (['high', 'medium', 'low'].includes(normalized)) {
                value = normalized;
              } else {
                value = 'low';
              }
            }
            
            if (dbField === 'onboarding_date') {
              if (value && !isNaN(Date.parse(value))) {
                value = new Date(value).toISOString().split('T')[0];
              } else {
                value = null;
              }
            }

            record[dbField] = value;
          }
        });

        return record;
      });

      const validRecords = records.filter(r => r[nameField]);
      
      if (validRecords.length === 0) {
        setError(`No valid records found. Make sure the "${importType === 'individual' ? 'Customer Name' : 'Business Name'}" column is mapped and has values.`);
        setImporting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(validRecords as any);

      if (insertError) throw insertError;

      toast({
        title: 'Import Successful',
        description: `${validRecords.length} ${importType} samples imported. You can now edit each one to complete the testing.`,
      });

      setOpen(false);
      resetDialog();
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to import records');
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setParsedData([]);
    setColumnMapping({});
    setError(null);
    setImportType('individual');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import KYC Samples from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-create KYC samples. Select the sample type and map your columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sample Type</label>
            <Tabs value={importType} onValueChange={(v) => handleTypeChange(v as ImportType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Individuals
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Businesses
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to upload a CSV file or drag and drop
              </span>
              <span className="text-xs text-muted-foreground">
                Required column: {importType === 'individual' ? 'Customer Name' : 'Business Name'}
              </span>
            </label>
          </div>

          {/* Expected Format */}
          <Alert>
            <AlertDescription>
              <strong>Expected CSV columns:</strong> {columns.map(c => c.label).join(', ')}
              <br />
              <span className="text-xs text-muted-foreground">
                Dates should be in YYYY-MM-DD format. Risk Rating should be: high, medium, or low.
              </span>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Preview ({parsedData.length} rows found)</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Columns auto-mapped
                </div>
              </div>

              {/* Column Mapping */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                {columns.map(col => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-xs font-medium">{col.label}</label>
                    <select
                      className="w-full text-sm p-1.5 border rounded bg-background"
                      value={columnMapping[col.key] || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [col.key]: e.target.value })}
                    >
                      <option value="">-- Not mapped --</option>
                      {Object.keys(parsedData[0]).map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Data Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      {columns.map(col => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                        {columns.map(col => (
                          <TableCell key={col.key} className="text-sm">
                            {columnMapping[col.key] ? row[columnMapping[col.key]] || '-' : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 5 && (
                  <div className="p-2 text-center text-sm text-muted-foreground bg-muted/30">
                    ... and {parsedData.length - 5} more rows
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? 'Importing...' : `Import ${parsedData.length} ${importType === 'individual' ? 'Individual' : 'Business'} Samples`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}