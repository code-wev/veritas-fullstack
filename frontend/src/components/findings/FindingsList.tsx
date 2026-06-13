import { Finding } from './FindingsModule';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getFindingTypeMeta, severityToFindingType } from '@/lib/findingClassification';
import { cn } from '@/lib/utils';

interface FindingsListProps {
  findings: Finding[];
  loading: boolean;
  onSelect: (finding: Finding) => void;
  onDelete: (findingId: string) => void;
  compact?: boolean;
}

export function FindingsList({ findings, loading, onSelect, onDelete, compact }: FindingsListProps) {
  const getMeta = (finding: Finding) => getFindingTypeMeta(
    finding.finding_type ?? severityToFindingType(finding.severity),
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'final': return 'default';
      case 'reviewed': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getSourceLabel = (finding: Finding): string => {
    if (finding.source_kyc_individual_id) return 'KYC Individual';
    if (finding.source_kyc_business_id) return 'KYC Business';
    if (finding.source_reporting_sample_id) return 'Transaction Report';
    if (finding.source_aml_finding_id) return 'AML Program';
    if (finding.source_governance_response_id) return 'Governance';
    if (finding.source_workpaper_id) return 'Workpaper';
    if (finding.source_interview_id) return 'Interview';
    return 'Manual';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No findings match the current filters.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {findings.map(finding => {
          const meta = getMeta(finding);
          return (
            <div
              key={finding.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => onSelect(finding)}
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn('text-xs', meta.badge)}>
                  {meta.shortLabel}
                </Badge>
                <span className="font-medium text-sm">{finding.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(finding.status)} className="text-xs">
                  {finding.status}
                </Badge>
                {finding.original_severity && finding.original_severity !== finding.severity && (
                  <Badge variant="outline" className="text-xs">Override</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">Classification</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[120px]">Module</TableHead>
            <TableHead className="w-[100px]">Obligation</TableHead>
            <TableHead className="w-[100px]">Source</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map(finding => {
            const meta = getMeta(finding);
            return (
            <TableRow key={finding.id} className="cursor-pointer" onClick={() => onSelect(finding)}>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={cn('text-xs whitespace-nowrap', meta.badge)}>
                    {meta.shortLabel}
                  </Badge>
                  {finding.original_severity && finding.original_severity !== finding.severity && (
                    <span className="text-xs text-muted-foreground" title="Reclassified from auto-flag default">*</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{finding.title}</p>
                  {finding.regulation_reference && (
                    <p className="text-xs text-muted-foreground">{finding.regulation_reference}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm capitalize">{finding.module.replace(/_/g, ' ')}</span>
                {finding.submodule && (
                  <p className="text-xs text-muted-foreground capitalize">{finding.submodule.replace(/_/g, ' ')}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {finding.nature_of_obligation === 'mandatory' ? 'Mandatory' : 
                   finding.nature_of_obligation === 'reasonable_measures' ? 'R. Measures' : 
                   finding.nature_of_obligation || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getSourceLabel(finding) !== 'Manual' && <Link2 className="h-3 w-3 text-muted-foreground" />}
                  <span className="text-xs">{getSourceLabel(finding)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(finding.status)}>
                  {finding.status}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {finding.date_identified ? format(new Date(finding.date_identified), 'MMM d, yyyy') : '-'}
                </span>
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelect(finding)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(finding.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
