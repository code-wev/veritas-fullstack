/**
 * MSB classification — single source of truth.
 *
 * - MSB_ENTITY_TYPES: client entity_type values that indicate the client is
 *   an MSB (or MSB-adjacent). Used by AppSidebar to gate the MSB Registration
 *   module and by CreateClientDialog to decide whether to show the activity
 *   selector.
 * - MSB_ACTIVITIES: FINTRAC's MSB activity categories. Drives which
 *   transaction reports apply (LCTR/EFTR/LVCTR/STR/LPEPR).
 * - DEFAULT_ACTIVITIES_FOR_ENTITY: pre-select sensible defaults when entity
 *   type implies a specific activity (e.g. "Cheque cashers" → cheque_cashing).
 */

/**
 * Substring matchers for client.entity_type values that indicate MSB status.
 *
 * Only includes types that are actually selectable in CreateClientDialog's
 * ENTITY_TYPES dropdown (kept in sync intentionally — see audit on
 * 2026-05-16). PSP and Crowdfunding are MSB *activities*, not entity types,
 * and live in MSB_ACTIVITIES below.
 */
export const MSB_ENTITY_TYPES = [
  'Money services businesses',
  'Money services business',
  'MSB',
  'Cheque cashers',
  'Armoured cars',
  'Acquirer services in relation to private automated banking machines',
];

/**
 * Case-insensitive substring match: an entity_type is MSB if any of the
 * above strings appears as a substring of the entity_type value.
 */
export function isMsbEntityType(entityType: string | null | undefined): boolean {
  if (!entityType) return false;
  const lower = entityType.toLowerCase();
  return MSB_ENTITY_TYPES.some(t => lower.includes(t.toLowerCase()));
}

export interface MsbActivity {
  value: string;
  label: string;
  description: string;
  /** Report types triggered by this activity. */
  triggers: Array<'lctr' | 'eftr' | 'lvctr' | 'str' | 'lpepr'>;
}

export const MSB_ACTIVITIES: MsbActivity[] = [
  {
    value: 'foreign_exchange',
    label: 'Foreign exchange dealing',
    description: 'Exchanging one type of currency for another (cash, wire, etc.)',
    triggers: ['lctr', 'str', 'lpepr'],
  },
  {
    value: 'money_transfer',
    label: 'Money transferring (remittance)',
    description: 'Sending or receiving funds on behalf of a person/entity',
    triggers: ['eftr', 'str', 'lpepr'],
  },
  {
    value: 'money_orders',
    label: 'Issuing or redeeming money orders / traveller’s cheques',
    description: 'Negotiable instruments issued or cashed',
    triggers: ['lctr', 'str', 'lpepr'],
  },
  {
    value: 'virtual_currency',
    label: 'Dealing in virtual currency',
    description: 'Exchange or transfer of virtual currency (BTC, ETH, USDC, etc.)',
    triggers: ['lvctr', 'str', 'lpepr'],
  },
  {
    value: 'cheque_cashing',
    label: 'Cheque cashing',
    description: 'Cashing cheques for a fee',
    triggers: ['lctr', 'str', 'lpepr'],
  },
  {
    value: 'armoured_car',
    label: 'Armoured car / cash-in-transit',
    description: 'Physical transport of cash for clients',
    triggers: ['lctr', 'str', 'lpepr'],
  },
  {
    value: 'abm_acquirer',
    label: 'Acquirer services for private ABMs',
    description: 'Operating or supplying private automated banking machines',
    triggers: ['lctr', 'str', 'lpepr'],
  },
  {
    value: 'crowdfunding_platform',
    label: 'Crowdfunding platform services',
    description: 'Operating a platform that pools contributions for projects',
    triggers: ['eftr', 'str', 'lpepr'],
  },
  {
    value: 'payment_service_provider',
    label: 'Payment service provider (PSP)',
    description: 'Performing payment functions under the Retail Payment Activities Act',
    triggers: ['eftr', 'str', 'lpepr'],
  },
];

/**
 * Sensible pre-selections when the client's entity_type implies a specific
 * activity. User can still override.
 */
export const DEFAULT_ACTIVITIES_FOR_ENTITY: Record<string, string[]> = {
  'Cheque cashers': ['cheque_cashing'],
  'Armoured cars': ['armoured_car'],
  'Acquirer services in relation to private automated banking machines': ['abm_acquirer'],
  'Crowdfunding platform services': ['crowdfunding_platform'],
  'PSP': ['payment_service_provider'],
};

export function defaultActivitiesFor(entityType: string | null | undefined): string[] {
  if (!entityType) return [];
  return DEFAULT_ACTIVITIES_FOR_ENTITY[entityType] ?? [];
}

/**
 * Given a list of activity codes, return the set of report types the
 * client is expected to file. Used to gate report-type tabs in the
 * Transaction Reporting module.
 */
export function reportTypesForActivities(activities: string[]): Set<string> {
  const set = new Set<string>();
  for (const code of activities) {
    const a = MSB_ACTIVITIES.find(x => x.value === code);
    if (!a) continue;
    for (const t of a.triggers) set.add(t);
  }
  return set;
}
