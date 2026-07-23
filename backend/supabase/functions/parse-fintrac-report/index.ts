import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `You are a FINTRAC report parser. Analyze the uploaded document and extract structured data as JSON.

The document is a FINTRAC report (could be LCTR, EFTR, STR, LVCTR, or LPEPR). Extract ALL data into this exact JSON structure:

{
  "report_type": "str|eftr|lctr|lvctr|lpepr",
  "report_header": {
    "reporting_entity_name": "string or null",
    "reporting_entity_number": "string or null",
    "submitting_re_number": "string or null (if different from reporting entity)",
    "activity_sector": "string description or null",
    "eft_direction": "Initiation or Final Receipt or null",
    "ministerial_directive": "string or null",
    "report_reference": "string or null",
    "submission_date": "YYYY-MM-DD or null — IMPORTANT: extract from the line that says 'SUBMITTED: YYYY-MM-DD HH:MM:SS' which appears right after the report summary line. Use the DATE from that SUBMITTED line exactly as written. Do NOT confuse with transaction dates.",
    "contact_id": "string or null"
  },
  "aggregation": {
    "is_aggregated": true/false,
    "type_code": "string or null",
    "period_start": "YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss or null",
    "period_end": "YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss or null"
  },
  "transactions": [
    {
      "transaction_number": 1,
      "amount": number or null,
      "currency": "CAD|USD|etc",
      "date_time": "YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss or null",
      "reference_number": "string or null",
      "exchange_rate": "string or null",
      "exchange_rate_source": "string or null",
      "threshold_indicator": true/false or null,
      "disposition_code": number or null,
      "completing_amount": number or null,
      "completing_currency": "string or null",
      "starting_action": {
        "requester": {
          "type": "person or entity",
          "name": "full name or entity name",
          "address": "full address string or null",
          "dob": "YYYY-MM-DD or null",
          "occupation": "string or null",
          "nature_of_business": "string or null (for entities)",
          "country_of_residence": "string or null",
          "phone": "string or null",
          "email": "string or null",
          "client_number": "string or null",
          "incorporation_info": "string or null",
          "identification": {
            "type": "passport|driver_license|etc or null",
            "number": "string or null",
            "jurisdiction": "country code or null"
          },
          "account": {
            "number": "string or null",
            "type": "string or null",
            "currency": "string or null",
            "fi_number": "string or null",
            "branch_number": "string or null"
          },
          "authorized_persons": [{"given_name": "string", "surname": "string"}]
        },
        "on_behalf_of": [
          {
            "name": "string or null",
            "relationship": "string or null",
            "address": "string or null"
          }
        ]
      },
      "completing_action": {
        "disposition_code": "number or null (e.g. 25=wire, 12=cash, etc.)",
        "amount": "number or null — the completing/disposition amount",
        "currency": "string or null — the completing/disposition currency",
        "exchange_rate": "string or null",
        "exchange_rate_source": "string or null",
        "beneficiary": {
          "type": "person or entity",
          "name": "string or null",
          "address": "string or null",
          "identification": {"type": null, "number": null, "jurisdiction": null},
          "account": {"number": null, "type": null, "currency": null, "fi_number": null, "branch_number": null},
          "authorized_persons": []
        },
        "on_behalf_of": []
      }
    }
  ],
  "str_narrative_text": "full STR narrative text if STR report, null otherwise",
  "completeness_flags": {
    "header_reporting_entity": true/false,
    "header_submission_timestamp": true/false,
    "header_report_reference": true/false,
    "activity_sector_code": true/false,
    "eft_direction": true/false,
    "ministerial_directive": true/false,
    "submitting_re_number": true/false,
    "txn_amount": true/false,
    "txn_currency": true/false,
    "txn_date_time": true/false,
    "txn_aggregation_indicator": true/false,
    "txn_aggregation_type": true/false,
    "txn_aggregation_period_start": true/false,
    "txn_aggregation_period_end": true/false,
    "client_name": true/false,
    "client_address": true/false,
    "client_dob": true/false,
    "client_occupation": true/false,
    "requester_account": true/false,
    "requester_identification": true/false,
    "authorized_persons": true/false,
    "on_behalf_of_requester": true/false,
    "beneficiary_name": true/false,
    "beneficiary_address": true/false,
    "beneficiary_account_wallet": true/false,
    "beneficiary_identification": true/false,
    "on_behalf_of_beneficiary": true/false,
    "exchange_rate": true/false,
    "str_narrative": true/false,
    "vc_identifiers": true/false
  },
  "summary": "Brief summary"
}

CRITICAL INSTRUCTIONS:
- Extract ALL transactions if there are multiple. Do not skip any.
- For each transaction, clearly separate starting action (requester/sender side) from completing action (beneficiary/receiver side).
- On-behalf-of parties are third parties acting on behalf of the requester or beneficiary. Include them if present.
- Set completeness_flags to true if the data is clearly present in the document, false if missing.
- Detect report type from keywords: "Suspicious Transaction" = str, "Electronic Funds Transfer" = eftr, "Large Cash Transaction" = lctr, "Large Virtual Currency" = lvctr, "Listed Person/Entity Property" = lpepr.
- For STR reports, extract the full narrative text.
- Read EVERY page of the document carefully. Do not stop after the first page.
- Extract names, addresses, account numbers, identification details exactly as they appear.
- 24-HOUR AGGREGATION: Always look for 24-hour rule / aggregation details, including labels such as "Aggregation type", "24-hour period", "Period Start", "Period End", "Start date/time", and "End date/time". Extract aggregation type and exact period start/end including seconds such as 23:59:59. Do not drop the time portion. Missing aggregation type, period start, or period end should set the corresponding completeness flag to false when aggregation applies.
- SUBMISSION DATE: Look for the line "SUBMITTED: YYYY-MM-DD HH:MM:SS" (appears after the summary/header area). The date on that line is the submission_date. Copy it exactly. Do NOT use any other date for submission_date.`;

function detectReportType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('suspicious')) return 'str';
  if (lower.includes('large cash')) return 'lctr';
  if (lower.includes('virtual currency')) return 'lvctr';
  if (lower.includes('listed person')) return 'lpepr';
  return 'eftr';
}

function normalizeAggregation(extracted: any) {
  const source = extracted.aggregation || extracted.twentyFourHourRule || extracted.twenty_four_hour_rule || {};
  const isAggregated = Boolean(
    source.is_aggregated ??
    source.isAggregated ??
    source.type_code ??
    source.typeCode ??
    source.aggregationTypeCode ??
    source.period_start ??
    source.periodStart ??
    source.period_end ??
    source.periodEnd,
  );

  return {
    is_aggregated: isAggregated,
    type_code: source.type_code || source.typeCode || source.aggregationTypeCode || source.aggregation_type || null,
    period_start: source.period_start || source.periodStart || source.startDateTime || source.start_date_time || null,
    period_end: source.period_end || source.periodEnd || source.endDateTime || source.end_date_time || null,
  };
}

function buildAIMessages(fileData: string, fileName: string, fileType: string) {
  const isPdf = fileType === 'application/pdf';
  const userContent: any[] = [
    { type: "text", text: `Parse this FINTRAC report file: ${fileName}. Extract all fields into the nested JSON structure. Read every page thoroughly.` },
  ];

  if (isPdf) {
    // Gemini supports PDFs natively via inline_data
    userContent.push({
      type: "image_url",
      image_url: { url: `data:application/pdf;base64,${fileData}` },
    });
  } else {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${fileType};base64,${fileData}` },
    });
  }

  return [
    { role: "system", content: EXTRACTION_PROMPT },
    { role: "user", content: userContent },
  ];
}

function buildParsedReport(extracted: any, fileName: string) {
  const flags = extracted.completeness_flags || {};
  const firstTxn = extracted.transactions?.[0];
  const aggregation = normalizeAggregation(extracted);

  return {
    report_type: extracted.report_type || detectReportType(fileName),
    report_reference_id: extracted.report_header?.report_reference || null,
    fintrac_submission_date: extracted.report_header?.submission_date || null,
    transaction_date: firstTxn?.date_time?.split?.('T')?.[0] || firstTxn?.date_time || null,
    transaction_amount: firstTxn?.amount || null,
    transaction_currency: firstTxn?.currency || 'CAD',
    filing_method: 'manual',
    is_aggregated: aggregation.is_aggregated,
    aggregation_type: aggregation.type_code,
    aggregation_period_start: aggregation.period_start,
    aggregation_period_end: aggregation.period_end,
    // Completeness flags
    header_reporting_entity: flags.header_reporting_entity ?? null,
    header_submission_timestamp: flags.header_submission_timestamp ?? null,
    header_report_reference: flags.header_report_reference ?? null,
    activity_sector_code: flags.activity_sector_code ?? null,
    eft_direction: flags.eft_direction ?? null,
    ministerial_directive: flags.ministerial_directive ?? null,
    submitting_re_number: flags.submitting_re_number ?? null,
    txn_amount: flags.txn_amount ?? null,
    txn_currency: flags.txn_currency ?? null,
    txn_date_time: flags.txn_date_time ?? null,
    txn_aggregation_indicator: flags.txn_aggregation_indicator ?? (aggregation.is_aggregated ? true : null),
    txn_aggregation_type: flags.txn_aggregation_type ?? (aggregation.is_aggregated ? !!aggregation.type_code : null),
    txn_aggregation_period_start: flags.txn_aggregation_period_start ?? (aggregation.is_aggregated ? !!aggregation.period_start : null),
    txn_aggregation_period_end: flags.txn_aggregation_period_end ?? (aggregation.is_aggregated ? !!aggregation.period_end : null),
    client_name: flags.client_name ?? null,
    client_address: flags.client_address ?? null,
    client_dob: flags.client_dob ?? null,
    client_occupation: flags.client_occupation ?? null,
    requester_account: flags.requester_account ?? null,
    requester_identification: flags.requester_identification ?? null,
    authorized_persons: flags.authorized_persons ?? null,
    on_behalf_of_requester: flags.on_behalf_of_requester ?? null,
    beneficiary_name: flags.beneficiary_name ?? null,
    beneficiary_address: flags.beneficiary_address ?? null,
    beneficiary_account_wallet: flags.beneficiary_account_wallet ?? null,
    beneficiary_identification: flags.beneficiary_identification ?? null,
    on_behalf_of_beneficiary: flags.on_behalf_of_beneficiary ?? null,
    third_party_indicator: (flags.on_behalf_of_requester || flags.on_behalf_of_beneficiary) ?? null,
    exchange_rate: flags.exchange_rate ?? null,
    exchange_rate_source: flags.exchange_rate ?? null,
    str_narrative: flags.str_narrative ?? null,
    vc_identifiers: flags.vc_identifiers ?? null,
    // Nested structure for preview
    parsed_json: {
      report_header: extracted.report_header || {},
      aggregation,
      transactions: extracted.transactions || [],
      str_narrative_text: extracted.str_narrative_text || null,
    },
    manual_notes: `Auto-parsed from ${fileName}. ${extracted.summary || 'Review required.'}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileName, fileType } = await req.json();
    if (!fileData) throw new Error("No file data provided");
    let apiKey = Deno.env.get("LOVABLE_API_KEY");
    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiModel = fileType === 'application/pdf' ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';

    if (!apiKey) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        apiKey = geminiKey;
        apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        apiModel = "gemini-3.5-flash";
      }
    }

    if (!apiKey) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        apiKey = openaiKey;
        apiUrl = "https://api.openai.com/v1/chat/completions";
        apiModel = "gpt-4o";
      }
    }

    if (!apiKey) {
      throw new Error("No AI API Key configured. Please set LOVABLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your Supabase project secrets.");
    }

    const messages = buildAIMessages(fileData, fileName, fileType);

    console.log(`Parsing ${fileName} (${fileType}) via ${apiUrl} using model ${apiModel}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiModel,
        messages,
        max_tokens: 16384,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", errorText);
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    console.log(`AI response length: ${content.length} chars`);

    let extracted: any;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      extracted = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      console.error("Failed to parse AI response as JSON, attempting cleanup...");
      // Try harder: strip any leading/trailing non-JSON content
      const braceStart = content.indexOf('{');
      const braceEnd = content.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd !== -1) {
        try {
          extracted = JSON.parse(content.substring(braceStart, braceEnd + 1));
        } catch {
          console.error("Second parse attempt failed");
          extracted = { report_type: detectReportType(content), summary: content.substring(0, 500) };
        }
      } else {
        extracted = { report_type: detectReportType(content), summary: content.substring(0, 500) };
      }
    }

    const parsedReport = buildParsedReport(extracted, fileName);

    return new Response(
      JSON.stringify({ reports: [parsedReport] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error parsing FINTRAC report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
