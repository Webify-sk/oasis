const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log("=========================================");
  console.log("STARTING PHASE 1 MIGRATION (LIVE UPDATE)");
  console.log("=========================================\n");
  
  // 1. Fetch profiles where credits > 0 and credits_expire_at is null
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, credits')
    .gt('credits', 0)
    .is('credits_expire_at', null);

  if (pError) {
    console.error("Error fetching profiles:", pError);
    return;
  }

  console.log(`Found ${profiles.length} profiles to process.\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const p of profiles) {
    // 2. Fetch newest invoice
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('created_at, description, amount')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (invError) {
      console.error(`  Error fetching invoices for user ${p.id}:`, invError);
      continue;
    }

    let validityMonths = 3; // Default for 60€ packages
    
    if (invoices && invoices.length > 0) {
      if (invoices[0].amount == 27) validityMonths = 1;
      else if (invoices[0].amount == 125) validityMonths = 2;
      else if (invoices[0].amount == 230) validityMonths = 4;
      else if (invoices[0].amount == 500) validityMonths = 9;
      else if (invoices[0].amount == 2500) validityMonths = 12;
      
      const lastValidDate = new Date(invoices[0].created_at);
      const expirationDate = new Date(lastValidDate);
      expirationDate.setMonth(expirationDate.getMonth() + validityMonths);
      
      const isExpired = new Date() > expirationDate;
      
      let updatePayload = {};
      if (isExpired) {
        updatePayload = {
          credits: 0,
          credits_expire_at: expirationDate.toISOString()
        };
      } else {
        updatePayload = {
          credits_expire_at: expirationDate.toISOString()
        };
      }
      
      // Execute the UPDATE on the profiles table
      const { error: updError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', p.id);
        
      if (updError) {
        console.error(`  [X] Failed to update user ${p.id}:`, updError.message);
      } else {
        if (isExpired) {
          console.log(`  [OK] User ${p.id} -> EXPIRED (Credits reset to 0, Exp: ${expirationDate.toISOString().split('T')[0]})`);
        } else {
          console.log(`  [OK] User ${p.id} -> VALID (Exp: ${expirationDate.toISOString().split('T')[0]})`);
        }
        updatedCount++;
      }

    } else {
      console.log(`  [SKIP] User ${p.id} has no invoices. Skipping (No expiration limit set).`);
      skippedCount++;
    }
  }
  
  console.log(`\n=========================================`);
  console.log(`MIGRATION COMPLETE.`);
  console.log(`Data updated for ${updatedCount} profiles.`);
  console.log(`Skipped ${skippedCount} profiles (No invoices found).`);
}

runMigration();
