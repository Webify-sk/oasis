const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://smdcavzkbtokfrckwqoe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZGNhdnprYnRva2ZyY2t3cW9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY4OTMwOCwiZXhwIjoyMDg1MjY1MzA4fQ.oizo8AseEAWymWsdMIZVkiKgsQnfTWL6QjQ-51-igYE'
);

async function check() {
    const { data, error } = await supabase
        .from('cosmetic_appointments')
        .select('*, cosmetic_services(title), employees(name)')
        .gte('start_time', '2026-03-13T00:00:00')
        .lte('start_time', '2026-03-13T23:59:59');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Total found:', data.length);
        data.forEach(d => {
            console.log(`- ${d.start_time} to ${d.end_time}`);
            console.log(`  Service: ${d.cosmetic_services?.title}`);
            console.log(`  Employee: ${d.employees?.name}`);
            console.log(`  Client Name: ${d.client_name || d.customer_name}`);
            console.log(`  Client Email: ${d.client_email || d.customer_email || d.email}`);
            console.log(`  Status: ${d.status}`);
            console.log(`  ID: ${d.id}`);
            console.log('---');
        });
    }
}
check();
