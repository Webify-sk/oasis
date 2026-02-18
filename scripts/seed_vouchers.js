const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://smdcavzkbtokfrckwqoe.supabase.co';
// Needs SERVICE_ROLE_KEY to write to DB if RLS is strict, but let's try with ANON first if policies allow insert (unlikely) or if I can get SERVICE KEY.
// Actually, I should use the service role key from env.local
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZGNhdnprYnRva2ZyY2t3cW9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY4OTMwOCwiZXhwIjoyMDg1MjY1MzA4fQ.oizo8AseEAWymWsdMIZVkiKgsQnfTWL6QjQ-51-igYE';

const supabase = createClient(supabaseUrl, supabaseKey);

const vouchers = [
    {
        title: 'Vstup 1x',
        price: 15,
        credit_amount: 1,
        category: 'Training',
        description: 'Jeden vstup na skupinové cvičenie',
        is_active: true
    },
    {
        title: 'Balík 10 vstupov',
        price: 130,
        credit_amount: 10,
        category: 'Training',
        description: 'Cenovo výhodný balík 10 vstupov',
        is_active: true
    },
    {
        title: 'Beauty Relax',
        price: 50,
        credit_amount: 0,
        category: 'Beauty',
        description: 'Voucher na kozmetické ošetrenie',
        is_active: true
    },
    {
        title: 'Masáž Celého Tela',
        price: 60,
        credit_amount: 0,
        category: 'Beauty',
        description: 'Relaxačná masáž celého tela (60 min)',
        is_active: true
    }
];

async function seed() {
    console.log('Seeding vouchers...');
    const { data, error } = await supabase
        .from('voucher_products')
        .insert(vouchers)
        .select();

    if (error) {
        console.error('Error seeding:', error);
    } else {
        console.log('Success! Created:', data.length, 'vouchers.');
    }
}

seed();
