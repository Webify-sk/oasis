const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOldCredits() {
  console.log("Fetching users with credits > 0 and no expiration date...");
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, credits')
    .gt('credits', 0)
    .is('credits_expire_at', null);

  if (pError) {
    console.error("Error fetching profiles:", pError);
    return;
  }

  console.log(`Found ${profiles.length} profiles with credits but no expiration.`);

  for (const p of profiles) {
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('created_at, description, amount')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false });

    console.log(`\nUser ID: ${p.id} - Credits: ${p.credits}`);
    let lastValidDate = null;
    let validityMonths = 3; // Default
    
    if (invoices && invoices.length > 0) {
      console.log(`  Latest invoice: ${invoices[0].created_at} - ${invoices[0].description} (${invoices[0].amount}€)`);
      if (invoices[0].amount == 27) validityMonths = 1;
      else if (invoices[0].amount == 125) validityMonths = 2;
      else if (invoices[0].amount == 230) validityMonths = 4;
      else if (invoices[0].amount == 500) validityMonths = 9;
      else if (invoices[0].amount == 2500) validityMonths = 12;
      lastValidDate = new Date(invoices[0].created_at);
    } else {
      console.log(`  No invoices found. Checking created_at of profile...`);
      const { data: profDate } = await supabase.from('profiles').select('created_at').eq('id', p.id).single();
      if (profDate && profDate.created_at) {
        lastValidDate = new Date(profDate.created_at);
        console.log(`  Profile created at: ${profDate.created_at}`);
      }
    }

    if (lastValidDate) {
      const expirationDate = new Date(lastValidDate);
      expirationDate.setMonth(expirationDate.getMonth() + validityMonths);
      const isExpired = new Date() > expirationDate;
      console.log(`  -> Estimated expiration: ${expirationDate.toISOString()} (Expired: ${isExpired})`);
    }

  }
}

checkOldCredits();
