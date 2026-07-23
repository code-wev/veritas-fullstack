/**
 * AI-assisted drafting of audit report sections.
 *
 * Inputs:  { report_id, section_key, extra_context?, model?, module_slug? }
 * Outputs: { content, model, input_tokens, output_tokens, latency_ms }
 *
 * The function:
 *   1. Loads the audit report + engagement + findings server-side (don't
 *      trust the client to scope the prompt — the client only passes IDs).
 *   2. Builds a section-specific prompt (executive summary / per-module
 *      narrative / recommendations / etc.) from a template registry.
 *   3. Calls the Lovable AI gateway with Claude.
 *   4. Returns the generated content so the client can persist it to
 *      whichever table owns that section (audit_reports for executive
 *      summary, audit_report_sections for everything else).
 *   5. Logs the call to ai_generation_log for cost/quality tracking.
 *
 * NOTE: This function is intentionally stateless — it never writes the
 * generated text back to the source-of-truth tables. The UI owns the
 * accept / reject / draft-watermark lifecycle.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are a senior FINTRAC compliance consultant drafting sections of an AML audit report for a reporting entity. Your audience is the compliance officer + senior management of the reporting entity, and ultimately a FINTRAC examiner if the report is requested.

Rules:
- Write in formal, factual, third-person tone — no marketing language, no hedging, no first-person.
- Cite findings by their FINTRAC classification (Complete non-compliance / Partial — Important / Moderate / Lesser / Observation) using the exact wording.
- Refer to the reporting entity by name; never use "the client" or "you".
- Never invent findings, dollar amounts, names, dates, or regulatory citations not present in the structured inputs you are given.
- If a section has no findings, say so plainly ("No deficiencies were identified in this area during the review period.") rather than padding.
- Output prose only — no markdown headers, no lists unless explicitly requested by the section template, no preamble like "Here is the draft:".`;

interface SectionTemplate {
  description: string;
  buildUserPrompt: (ctx: PromptContext) => string;
  // Approximate token budget for output — the section editor will scroll if it exceeds.
  maxOutputTokens: number;
}

interface PromptContext {
  reportingEntityName: string;
  reviewPeriod: string | null;
  findings: FindingSummary[];
  sectionTitle: string;
  extraContext: string | null;
  // Module breakdown for per-module narratives
  moduleSlug: string | null;
}

interface FindingSummary {
  module: string;
  classification: string;
  severity: string;
  title: string;
  rationale: string;
}

/**
 * One template per section_key. Keep these prompts small + composable.
 * Add new section_keys here as the audit report grows.
 */
const SECTION_TEMPLATES: Record<string, SectionTemplate> = {
  executive_summary: {
    description: "1–2 paragraph executive summary opening the report",
    maxOutputTokens: 600,
    buildUserPrompt: (ctx) => {
      const counts = countByClassification(ctx.findings);
      return `Draft the Executive Summary for ${ctx.reportingEntityName}'s AML compliance review${ctx.reviewPeriod ? ` covering ${ctx.reviewPeriod}` : ""}.

Findings breakdown:
${formatClassificationCounts(counts)}

Top findings (in order of severity):
${formatTopFindings(ctx.findings, 5)}

Format: 2 paragraphs, ~150 words total. Paragraph 1: scope and overall conclusion ("The review identified X deficiencies, of which Y rise to the level of Complete non-compliance..."). Paragraph 2: the single most important remediation priority.${ctx.extraContext ? `\n\nReviewer guidance: ${ctx.extraContext}` : ""}`;
    },
  },

  module_narrative: {
    description: "Per-module findings narrative (KYC / Transaction Reporting / Sanctions / etc.)",
    maxOutputTokens: 800,
    buildUserPrompt: (ctx) => {
      const moduleFindings = ctx.findings.filter((f) => f.module === ctx.moduleSlug);
      if (moduleFindings.length === 0) {
        return `Draft the ${ctx.sectionTitle} narrative for ${ctx.reportingEntityName}. No deficiencies were identified in this module during the review. State this plainly (1-2 sentences) including the scope of what was tested. Do not pad.`;
      }
      return `Draft the ${ctx.sectionTitle} narrative for ${ctx.reportingEntityName}.

Module: ${ctx.moduleSlug}
Findings in this module:
${formatTopFindings(moduleFindings, 10)}

Format: ~150 words. Open with the scope of what was tested in this module. Then describe the key deficiencies, grouped by FINTRAC classification (Complete NC first, then Partial — Important, then Moderate, then Lesser). Close with the highest-priority remediation.${ctx.extraContext ? `\n\nReviewer guidance: ${ctx.extraContext}` : ""}`;
    },
  },

  consolidated_recommendations: {
    description: "Prioritized remediation list across all modules",
    maxOutputTokens: 1000,
    buildUserPrompt: (ctx) => {
      return `Draft the Consolidated Recommendations section for ${ctx.reportingEntityName}.

All findings:
${formatTopFindings(ctx.findings, 20)}

Format: numbered list, 3-7 items. Each item is one sentence — the action the RE must take. Order by FINTRAC classification severity (Complete NC items first). Group multiple findings sharing the same remediation into one item rather than repeating.${ctx.extraContext ? `\n\nReviewer guidance: ${ctx.extraContext}` : ""}`;
    },
  },
};

function countByClassification(findings: FindingSummary[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.classification] = (counts[f.classification] || 0) + 1;
  }
  return counts;
}

function formatClassificationCounts(counts: Record<string, number>): string {
  const order = ["complete_nc", "partial_important", "partial_moderate", "partial_lesser", "observation"];
  const labels: Record<string, string> = {
    complete_nc: "Complete non-compliance",
    partial_important: "Partial — Important weakness",
    partial_moderate: "Partial — Moderate weakness",
    partial_lesser: "Partial — Lesser weakness",
    observation: "Observation",
  };
  return order
    .filter((k) => counts[k] > 0)
    .map((k) => `  - ${labels[k]}: ${counts[k]}`)
    .join("\n") || "  - No findings recorded";
}

function formatTopFindings(findings: FindingSummary[], limit: number): string {
  // Severity-weighted sort: Complete NC first, then Important, Moderate, Lesser.
  const order: Record<string, number> = {
    complete_nc: 0, partial_important: 1, partial_moderate: 2, partial_lesser: 3, observation: 4,
  };
  const sorted = [...findings].sort((a, b) => (order[a.classification] ?? 9) - (order[b.classification] ?? 9));
  return sorted.slice(0, limit).map((f, i) =>
    `  ${i + 1}. [${f.classification}] (${f.module}) ${f.title} — ${f.rationale}`
  ).join("\n") || "  (none)";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let apiKey = Deno.env.get("LOVABLE_API_KEY");
  let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

  if (!apiKey) {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      apiKey = geminiKey;
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    }
  }

  if (!apiKey) {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      apiKey = openaiKey;
      apiUrl = "https://api.openai.com/v1/chat/completions";
    }
  }

  // Service-role client — this function does the auth check itself via the
  // caller's bearer token, then uses service_role for DB writes (bypassing
  // RLS only after we've confirmed access).
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let userId: string | null = null;
  let engagementId: string | null = null;
  let body: any = null;

  try {
    if (!apiKey) throw new Error("No AI API Key configured. Please set LOVABLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your Supabase project secrets.");

    // 1. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Unauthenticated");
    userId = userData.user.id;

    // 2. Parse body
    body = await req.json();
    const { report_id, section_key, extra_context, model: requestedModel, module_slug } = body;
    if (!report_id || !section_key) {
      throw new Error("report_id and section_key are required");
    }

    const template = SECTION_TEMPLATES[section_key];
    if (!template) {
      throw new Error(`Unknown section_key: ${section_key}. Add a template to SECTION_TEMPLATES.`);
    }

    // 3. Load the report + engagement + section
    const { data: report, error: reportErr } = await admin
      .from("audit_reports")
      .select("id, engagement_id, prepared_for_company")
      .eq("id", report_id)
      .single();
    if (reportErr || !report) throw new Error(`Report ${report_id} not found`);
    engagementId = report.engagement_id;

    // 4. Authorize: caller must have engagement access
    const { data: accessData } = await admin.rpc("has_engagement_access", {
      _user_id: userId,
      _engagement_id: engagementId,
    });
    if (!accessData) throw new Error("Forbidden: no access to this engagement");

    const { data: engagement } = await admin
      .from("engagements")
      .select("id, review_period_start, review_period_end")
      .eq("id", engagementId)
      .single();

    // Pull existing section_title if there's an audit_report_sections row for
    // this key — purely so the prompt can use a human-readable section name.
    // No write-back happens here; the client owns persistence.
    const { data: existingSection } = await admin
      .from("audit_report_sections")
      .select("id, section_title")
      .eq("report_id", report_id)
      .eq("section_key", section_key)
      .maybeSingle();

    // 5. Load findings — aggregated, no client PII. Adjust this query to your
    //    actual findings schema (the example uses the consolidated
    //    audit_report_findings_summary view; switch to your per-module
    //    findings tables if you prefer richer per-module data).
    const { data: summaryRows } = await admin
      .from("audit_report_findings_summary")
      .select("regulatory_requirement, finding_summary, categorization")
      .eq("report_id", report_id);

    const findings: FindingSummary[] = (summaryRows || []).map((r: any) => ({
      module: extractModule(r.regulatory_requirement),
      classification: normalizeClassification(r.categorization),
      severity: r.categorization || "unknown",
      title: r.regulatory_requirement || "Untitled finding",
      rationale: r.finding_summary || "(no summary)",
    }));

    // 6. Build prompt
    const ctx: PromptContext = {
      reportingEntityName: report.prepared_for_company || "the reporting entity",
      reviewPeriod: engagement
        ? formatReviewPeriod(engagement.review_period_start, engagement.review_period_end)
        : null,
      findings,
      sectionTitle: existingSection?.section_title || section_key,
      extraContext: extra_context || null,
      moduleSlug: module_slug || null,
    };
    const userPrompt = template.buildUserPrompt(ctx);

    // 7. Call Lovable AI gateway / API provider
    let model = requestedModel || DEFAULT_MODEL;
    if (apiUrl.includes("generativelanguage.googleapis.com")) {
      model = "gemini-3.5-flash";
    } else if (apiUrl.includes("api.openai.com")) {
      model = "gpt-4o";
    }

    console.log(`Drafting section ${section_key} via ${apiUrl} using model ${model}`);

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: template.maxOutputTokens,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway ${aiResponse.status}: ${errorText.slice(0, 500)}`);
    }

    const aiJson = await aiResponse.json();
    const generated = aiJson.choices?.[0]?.message?.content?.trim();
    if (!generated) throw new Error("Empty response from AI gateway");

    const inputTokens = aiJson.usage?.prompt_tokens ?? null;
    const outputTokens = aiJson.usage?.completion_tokens ?? null;
    const totalTokens = aiJson.usage?.total_tokens ?? null;

    // 8. Log the call — the client persists the generated content itself.
    const promptContextSnapshot = {
      section_key,
      extra_context: extra_context || null,
      module_slug: module_slug || null,
      finding_counts: countByClassification(findings),
    };

    const latencyMs = Date.now() - startTime;

    await admin.from("ai_generation_log").insert({
      engagement_id: engagementId,
      user_id: userId,
      function_name: "draft-audit-section",
      model,
      // Subject is the report (the content can land in different tables
      // depending on the section_key — caller persists, we just log scope).
      subject_type: "audit_reports",
      subject_id: report_id,
      prompt_context: promptContextSnapshot,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      latency_ms: latencyMs,
      status: "success",
    });

    return new Response(
      JSON.stringify({
        content: generated,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[draft-audit-section] error:", error);
    // Best-effort error log — don't throw if logging itself fails
    try {
      await admin.from("ai_generation_log").insert({
        engagement_id: engagementId,
        user_id: userId,
        function_name: "draft-audit-section",
        model: body?.model || DEFAULT_MODEL,
        subject_type: "audit_report_sections",
        prompt_context: body ? { section_key: body.section_key } : null,
        latency_ms: Date.now() - startTime,
        status: "error",
        error_message: error.message?.slice(0, 1000) || "Unknown error",
      });
    } catch (logErr) {
      console.error("[draft-audit-section] failed to log error:", logErr);
    }
    return new Response(
      JSON.stringify({ error: error.message || "Drafting failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReviewPeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

/**
 * Best-effort module detection from a finding's regulatory_requirement string.
 * Replace with a real join to your per-module findings tables when you wire
 * the function up for production — this is just enough to get the executive
 * summary prompt useful.
 */
function extractModule(requirement: string | null): string {
  if (!requirement) return "unknown";
  const r = requirement.toLowerCase();
  if (r.includes("kyc") || r.includes("client identification")) return "kyc";
  if (r.includes("lctr") || r.includes("eftr") || r.includes("str") || r.includes("lvctr") || r.includes("reporting")) return "transaction_reporting";
  if (r.includes("sanction")) return "sanctions";
  if (r.includes("monitoring")) return "transaction_monitoring";
  if (r.includes("msb") || r.includes("registration")) return "msb_registration";
  if (r.includes("compliance officer") || r.includes("program") || r.includes("policy")) return "compliance_program";
  if (r.includes("training")) return "training";
  if (r.includes("risk assessment")) return "risk_assessment";
  return "other";
}

/**
 * Coerce the various severity strings in the codebase ("complete_nc",
 * "complete_non_compliance", "critical", etc.) into the canonical 5-level
 * FINTRAC taxonomy used by the prompts.
 */
function normalizeClassification(raw: string | null): string {
  if (!raw) return "observation";
  const r = raw.toLowerCase();
  if (r.includes("complete")) return "complete_nc";
  if (r.includes("important") || r === "high") return "partial_important";
  if (r.includes("moderate") || r === "medium") return "partial_moderate";
  if (r.includes("lesser") || r === "low") return "partial_lesser";
  if (r === "critical") return "complete_nc";
  return "observation";
}
