import { format } from 'date-fns';

export interface ReportContext {
  clientName?: string;
  entityType?: string;
  periodStart?: string;
  periodEnd?: string;
  // From audit_reports
  preparedForName?: string;
  preparedForTitle?: string;
  preparedForCompany?: string;
  preparedForAddress?: string;
  preparedByCompany?: string;
  preparedByAddress?: string;
  preparedByContact?: string;
  leadReviewerName?: string;
  leadReviewerCredentials?: string;
  // From MSB registration
  msbNumber?: string;
  msbRegistrationDate?: string;
  msbExpiryDate?: string;
  incorporationNumber?: string;
  incorporationDate?: string;
  jurisdictionOfIncorporation?: string;
  businessAddress?: string;
  websiteAddress?: string;
  complianceOfficerName?: string;
  msbActivities?: string[];
}

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
};

export function replacePlaceholders(content: string | null, ctx: ReportContext): string {
  if (!content) return '';

  const replacements: Record<string, string> = {
    '[CLIENT_NAME]': ctx.clientName || '[CLIENT_NAME]',
    '[COMPANY_NAME]': ctx.clientName || '[COMPANY_NAME]',
    '[PERIOD_START]': formatDate(ctx.periodStart) || '[PERIOD_START]',
    '[PERIOD_END]': formatDate(ctx.periodEnd) || '[PERIOD_END]',
    '[PREPARED_FOR_NAME]': ctx.preparedForName || '[PREPARED_FOR_NAME]',
    '[PREPARED_FOR_TITLE]': ctx.preparedForTitle || '[PREPARED_FOR_TITLE]',
    '[PREPARED_FOR_COMPANY]': ctx.preparedForCompany || ctx.clientName || '[PREPARED_FOR_COMPANY]',
    '[PREPARED_FOR_ADDRESS]': ctx.preparedForAddress || '[PREPARED_FOR_ADDRESS]',
    '[PREPARED_BY_COMPANY]': ctx.preparedByCompany || 'C&G Professional Services Inc.',
    '[PREPARED_BY_ADDRESS]': ctx.preparedByAddress || '[PREPARED_BY_ADDRESS]',
    '[CONTACT_INFO]': ctx.preparedByContact || '[CONTACT_INFO]',
    '[LEAD_REVIEWER_NAME]': ctx.leadReviewerName || '[LEAD_REVIEWER_NAME]',
    '[LEAD_REVIEWER_CREDENTIALS]': ctx.leadReviewerCredentials || '[LEAD_REVIEWER_CREDENTIALS]',
    '[MSB_NUMBER]': ctx.msbNumber || '[MSB_NUMBER]',
    '[MSB_REGISTRATION_DATE]': formatDate(ctx.msbRegistrationDate) || '[MSB_REGISTRATION_DATE]',
    '[MSB_EXPIRY_DATE]': formatDate(ctx.msbExpiryDate) || '[MSB_EXPIRY_DATE]',
    '[INCORPORATION_NUMBER]': ctx.incorporationNumber || '[INCORPORATION_NUMBER]',
    '[INCORPORATION_DATE]': formatDate(ctx.incorporationDate) || '[INCORPORATION_DATE]',
    '[JURISDICTION]': ctx.jurisdictionOfIncorporation || '[JURISDICTION]',
    '[CLIENT_ADDRESS]': ctx.businessAddress || '[CLIENT_ADDRESS]',
    '[CLIENT_WEBSITE]': ctx.websiteAddress || '[CLIENT_WEBSITE]',
    '[AUTHORIZED_SERVICES]': ctx.msbActivities?.join(', ') || '[AUTHORIZED_SERVICES]',
    '[REPORT_DATE]': formatDate(new Date().toISOString()),
    '[ENGAGEMENT_DATE]': '', // filled from engagement letter if available
    '[REVIEWER_BIO]': '[REVIEWER_BIO]',
    '[DESCRIBE_BUSINESS_MODEL]': '[DESCRIBE_BUSINESS_MODEL]',
    '[DESCRIBE_GOVERNANCE_STRUCTURE]': '[DESCRIBE_GOVERNANCE_STRUCTURE]',
  };

  let result = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value);
  }
  return result;
}

/**
 * Generate the "About the Reporting Entity" section content.
 * If MSB data is available, produces a fully populated paragraph.
 * Otherwise returns a generic template for the analyst to fill.
 */
export function generateAboutEntityContent(ctx: ReportContext): string {
  const clientName = ctx.clientName || '[CLIENT_NAME]';
  const hasMsbData = !!(ctx.msbNumber || ctx.msbRegistrationDate);

  if (hasMsbData) {
    const incorpLine = ctx.incorporationDate || ctx.jurisdictionOfIncorporation || ctx.incorporationNumber
      ? `${clientName} was incorporated on ${formatDate(ctx.incorporationDate) || '[INCORPORATION_DATE]'} under the laws of ${ctx.jurisdictionOfIncorporation || '[JURISDICTION]'}, Canada (Incorporation Number: ${ctx.incorporationNumber || '[INCORPORATION_NUMBER]'}). `
      : '';

    const msbLine = `The Company is registered with FINTRAC under MSB registration number ${ctx.msbNumber || '[MSB_NUMBER]'}. Its initial MSB registration was dated ${formatDate(ctx.msbRegistrationDate) || '[MSB_REGISTRATION_DATE]'}, and the current expiry date is ${formatDate(ctx.msbExpiryDate) || '[MSB_EXPIRY_DATE]'}.`;

    const addressLine = ctx.businessAddress || ctx.websiteAddress
      ? `\n\nThe company has its registered office at ${ctx.businessAddress || '[CLIENT_ADDRESS]'}${ctx.websiteAddress ? ` with its official website at: ${ctx.websiteAddress}` : ''}.`
      : '';

    const servicesLine = ctx.msbActivities && ctx.msbActivities.length > 0
      ? `\n\nUnder its FINTRAC registration, ${clientName} is authorized to provide services related to ${ctx.msbActivities.join(', ')}. [DESCRIBE_BUSINESS_MODEL].`
      : `\n\nUnder its FINTRAC registration, ${clientName} is authorized to provide services related to [AUTHORIZED_SERVICES]. [DESCRIBE_BUSINESS_MODEL].`;

    const governanceLine = `\n\n**Governance Structure:**\n[DESCRIBE_GOVERNANCE_STRUCTURE]`;
    
    const complianceLine = `\n\n**Compliance Regime:**\n${clientName} maintains a compliance program, including having a compliance officer, written compliance policies and procedures, risk assessment, ongoing compliance training program, and a review of its compliance program.`;

    const periodLine = ctx.periodStart && ctx.periodEnd
      ? `\n\n**Coverage Period:**\nOur review covered ${formatDate(ctx.periodStart)} to ${formatDate(ctx.periodEnd)}.`
      : `\n\n**Coverage Period:**\nOur review covered [PERIOD_START] to [PERIOD_END].`;

    return `${incorpLine}${msbLine}${addressLine}${servicesLine}${governanceLine}${complianceLine}${periodLine}`;
  }

  // Non-MSB: generic template for analyst
  return `${clientName} [describe incorporation details, jurisdiction, and registration information].

**Business Activities:**
[Describe the entity's principal business activities and services offered]

**Governance Structure:**
[DESCRIBE_GOVERNANCE_STRUCTURE]

**Compliance Regime:**
${clientName} maintains a compliance program, including having a compliance officer, written compliance policies and procedures, risk assessment, ongoing compliance training program, and a review of its compliance program.

**Coverage Period:**
Our review covered ${formatDate(ctx.periodStart) || '[PERIOD_START]'} to ${formatDate(ctx.periodEnd) || '[PERIOD_END]'}.`;
}
