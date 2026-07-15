import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const envText = readFileSync(filePath, 'utf8');
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env'));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { data, error } = await supabase
    .from('aml_program_question_templates')
    .select('question_code, section_code, section_name, applicability')
    .eq('submodule', 'policies_procedures')
    .eq('control_area', 'core_controls')
    .eq('is_active', true)
    .order('sort_order');
    
  if (error) {
    console.error(error);
    return;
  }
  
  // Print summary of counts grouped by section and applicability
  const summary = {};
  for (const q of data) {
    const key = `${q.section_code}. ${q.section_name}`;
    if (!summary[key]) summary[key] = {};
    const app = q.applicability || 'NULL';
    summary[key][app] = (summary[key][app] || 0) + 1;
  }
  
  console.log('--- Question Applicability Summary ---');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error);
