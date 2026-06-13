/**
 * Deficiency Severity classification taxonomy.
 *
 * The methodology is inspired by regulatory review practices (FINTRAC's
 * harm-done framework in particular) but is the firm's own internal grading
 * — this app does not represent its output as a FINTRAC examination.
 *
 * Every row in public.findings has both a legacy `severity` field
 * (critical/high/medium/low) and a `finding_type` field that drives
 * the audit-report narrative and the firm-overview breakdowns.
 *
 * The DB trigger keeps the two in sync, so frontend code can choose either
 * dimension to write — but should prefer finding_type for new code.
 */

export type FindingType =
  | 'complete_nc'
  | 'partial_important'
  | 'partial_moderate'
  | 'partial_lesser'
  | 'observation';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface FindingTypeMeta {
  type: FindingType;
  label: string;
  shortLabel: string;
  severity: FindingSeverity;
  description: string;
  /** Display order — most severe first */
  rank: number;
  /** Whether this counts as a deficiency (vs. a best-practice observation) */
  isDeficiency: boolean;
  /** Tailwind classes for the badge */
  badge: string;
}

export const FINDING_TYPE_META: Record<FindingType, FindingTypeMeta> = {
  complete_nc: {
    type: 'complete_nc',
    label: 'Complete Non-Compliance',
    shortLabel: 'Complete NC',
    severity: 'critical',
    description:
      'The requirement has not been met. Either no measures are in place, or what exists is too rudimentary. Most severe.',
    rank: 0,
    isDeficiency: true,
    badge: 'border-destructive/40 text-destructive bg-destructive/10',
  },
  partial_important: {
    type: 'partial_important',
    label: 'Partial Non-Compliance – Significant',
    shortLabel: 'Partial: Significant',
    severity: 'high',
    description:
      'A priority control element is missed (e.g. compliance officer not formally appointed; required reporting workflow undefined).',
    rank: 1,
    isDeficiency: true,
    badge: 'border-warning/50 text-warning-foreground bg-warning/15',
  },
  partial_moderate: {
    type: 'partial_moderate',
    label: 'Partial Non-Compliance – Moderate',
    shortLabel: 'Partial: Moderate',
    severity: 'medium',
    description:
      'A foundational element is missed (e.g. risk-assessment document not updated; staff training cadence not defined).',
    rank: 2,
    isDeficiency: true,
    badge: 'border-warning/30 text-foreground bg-warning/5',
  },
  partial_lesser: {
    type: 'partial_lesser',
    label: 'Partial Non-Compliance – Minor',
    shortLabel: 'Partial: Minor',
    severity: 'low',
    description:
      'An efficiency or documentation element is missed (e.g. customer occupation vague; version-control field missing).',
    rank: 3,
    isDeficiency: true,
    badge: 'border-muted-foreground/30 text-muted-foreground bg-muted',
  },
  observation: {
    type: 'observation',
    label: 'Observation / Enhancement Opportunity',
    shortLabel: 'Observation',
    severity: 'low',
    description:
      'Not a deficiency. A process improvement opportunity based on industry best practice or reviewer experience.',
    rank: 4,
    isDeficiency: false,
    badge: 'border-primary/30 text-primary bg-primary/5',
  },
};

export const FINDING_TYPES: FindingTypeMeta[] = Object.values(FINDING_TYPE_META).sort(
  (a, b) => a.rank - b.rank,
);

/** Map legacy severity → finding_type. Mirrors the DB trigger. */
export function severityToFindingType(severity: string | null | undefined): FindingType {
  switch (severity) {
    case 'critical':
      return 'complete_nc';
    case 'high':
      return 'partial_important';
    case 'medium':
      return 'partial_moderate';
    case 'low':
      return 'partial_lesser';
    default:
      return 'partial_moderate';
  }
}

/** Map finding_type → severity. Mirrors the DB trigger. */
export function findingTypeToSeverity(type: FindingType): FindingSeverity {
  return FINDING_TYPE_META[type].severity;
}

export function getFindingTypeMeta(type: string | null | undefined): FindingTypeMeta {
  if (type && type in FINDING_TYPE_META) return FINDING_TYPE_META[type as FindingType];
  return FINDING_TYPE_META.partial_moderate;
}

/**
 * Combination rule: when a finding has multiple weaknesses, the highest
 * (most severe) classification wins.
 */
export function highestFindingType(types: FindingType[]): FindingType {
  if (types.length === 0) return 'partial_moderate';
  return types.reduce((acc, t) =>
    FINDING_TYPE_META[t].rank < FINDING_TYPE_META[acc].rank ? t : acc,
  );
}

export function isDeficiency(type: FindingType): boolean {
  return FINDING_TYPE_META[type].isDeficiency;
}
