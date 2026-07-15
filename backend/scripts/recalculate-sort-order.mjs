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
  
  console.log('Recalculating sort orders for active question templates...');
  
  // 1. Fetch all active question templates
  const { data: questions, error: fetchError } = await supabase
    .from('aml_program_question_templates')
    .select('*')
    .eq('submodule', 'policies_procedures')
    .eq('control_area', 'core_controls')
    .eq('is_active', true)
    .order('question_number');
    
  if (fetchError) {
    console.error('Error fetching questions:', fetchError);
    return;
  }
  
  // 2. Define the section position mapper
  const getSectionPos = (code) => {
    if (code.startsWith('DCG-')) return 1;
    if (code.startsWith('LRF-')) return 2;
    if (code.startsWith('ECR-')) return 3;
    if (code.startsWith('RR-')) return 4;
    if (code.startsWith('TRN-')) return 5;
    if (code.startsWith('MSB-')) return 6;
    if (code.startsWith('KYC-')) return 7;
    if (code.startsWith('BO-')) return 8;
    if (code.startsWith('BR-')) return 9;
    if (code.startsWith('TPD-')) return 10;
    if (code.startsWith('PEP-')) return 11;
    if (code.startsWith('SAN-')) return 12;
    if (code.startsWith('REP-')) return 13;
    if (code.startsWith('RK-')) return 14;
    if (code.startsWith('LED-')) return 15;
    return 99;
  };
  
  // Group questions by section position
  const groups = {};
  for (const q of questions) {
    const pos = getSectionPos(q.question_code || '');
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(q);
  }
  
  // 3. Update each question's sort_order sequentially
  let count = 0;
  for (const pos of Object.keys(groups)) {
    const list = groups[pos];
    // Sort within section by question_number
    list.sort((a, b) => a.question_number - b.question_number);
    
    for (let idx = 0; idx < list.length; idx++) {
      const q = list[idx];
      const newSortOrder = Number(pos) * 1000 + (idx + 1);
      
      const { error: updateError } = await supabase
        .from('aml_program_question_templates')
        .update({ sort_order: newSortOrder })
        .eq('id', q.id);
        
      if (updateError) {
        console.error(`Error updating sort_order for ${q.question_code}:`, updateError);
      } else {
        count++;
      }
    }
  }
  
  console.log(`Successfully recalculated and updated sort_order for ${count} templates.`);
}

main().catch(console.error);
