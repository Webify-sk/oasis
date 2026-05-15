const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClient() {
  const { data: allProfiles, error } = await supabase.from('profiles').select('*');

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  const profiles = allProfiles.filter(p => 
      p.full_name && p.full_name.toLowerCase().includes('michaela') &&
      (p.full_name.toLowerCase().includes('krizikova') || p.full_name.toLowerCase().includes('krížiková'))
  );

  if (profiles.length === 0) {
      console.log("No profile found for Michaela Krizikova.");
      return;
  }

  for (const p of profiles) {
      console.log("=========================================");
      console.log(`Profile: ${p.full_name} (${p.email})`);
      console.log(`Credits: ${p.credits}`);
      console.log(`Credits Expire At: ${p.credits_expire_at}`);
      console.log(`ID: ${p.id}`);
      
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false });
        
      if (invError) {
          console.error("Error fetching invoices:", invError);
      } else {
          console.log(`\nInvoices (${invoices.length}):`);
          for (const inv of invoices) {
              console.log(`  - ${inv.created_at} | Amount: ${inv.amount}€ | Desc: ${inv.description}`);
          }
      }

      const { data: batches, error: batchError } = await supabase
        .from('credit_batches')
        .select('*')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false });
        
      if (batchError) {
          console.error("Error fetching batches:", batchError);
      } else if (batches && batches.length > 0) {
          console.log(`\nCredit Batches (${batches.length}):`);
          for (const b of batches) {
              console.log(`  - [${b.created_at}] Amount: ${b.amount}, Remaining: ${b.remaining_amount}, Expires: ${b.expires_at}, Desc: ${b.description}`);
          }
      }

      const { data: bookings, error: bookError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (bookError) {
          console.error("Error fetching bookings:", bookError);
      } else if (bookings && bookings.length > 0) {
          console.log(`\nRecent Bookings (${bookings.length}):`);
          for (const b of bookings) {
              console.log(`  - [${b.created_at}] Status: ${b.status}, Start: ${b.start_time}`);
          }
      }

      const { data: deductions, error: dedError } = await supabase
        .from('booking_deductions')
        .select('*, bookings(start_time)')
        .in('batch_id', batches.map(b => b.id));
        
      if (dedError) {
          console.error("Error fetching deductions:", dedError);
      } else if (deductions && deductions.length > 0) {
          console.log(`\nBooking Deductions (${deductions.length}):`);
          for (const d of deductions) {
              console.log(`  - Deduction: amount ${d.amount}, batch_id: ${d.batch_id}, booking_id: ${d.booking_id}`);
          }
      }
  }
}

checkClient();
