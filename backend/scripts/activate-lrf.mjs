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
  
  console.log('Activating LRF questions...');
  const { data, error } = await supabase
    .from('aml_program_question_templates')
    .update({ is_active: true })
    .eq('submodule', 'policies_procedures')
    .eq('control_area', 'core_controls')
    .like('question_code', 'LRF-%')
    .select();
    
  if (error) {
    console.error('Error activating LRF:', error);
    return;
  }
  
  console.log(`Activated ${data?.length || 0} LRF questions.`);
  
  // Re-run mapping logic to ensure section_code = '2' and section_name = 'Legal & Regulatory Framework'
  // (matching Step 4 of the 20260519200000 migration)
  console.log('Re-running section mapping for LRF...');
  const { data: updated, error: updateError } = await supabase
    .from('aml_program_question_templates')
    .update({ 
      section_code: '2',
      section_name: 'Legal & Regulatory Framework'
    })
    .eq('submodule', 'policies_procedures')
    .eq('control_area', 'core_controls')
    .eq('is_active', true)
    .like('question_code', 'LRF-%')
    .select();
    
  if (updateError) {
    console.error('Error re-running section mapping for LRF:', updateError);
    return;
  }
  
  console.log(`Mapped ${updated?.length || 0} LRF questions to Section 2.`);
}

main().catch(console.error);
