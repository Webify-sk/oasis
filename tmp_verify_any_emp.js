const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Just import the real function from your next instance (or simulate it). 
// Since we can't easily import a Next TS module in raw Node, we will use the API GET we created.

async function testApi() {
    const serviceId = '46aeed62-7d15-4cca-88c3-e563eca46e1b'; // Kozmetika
    const date = '2026-03-19';

    // First, let's find Leona's ID to query her directly via API
    const { data: employees } = await supabase.from('employees').select('id, name');
    let leonaId = employees.find(e => e.name.toLowerCase().includes('leona'))?.id;

    console.log(`Leona ID: ${leonaId}`);

    // Call the debug generic endpoint we wrote earlier
    // Wait, the API endpoint needs NextJS to be running.
    console.log(`Will test hitting http://localhost:3000/api/debug?employeeId=${leonaId}&serviceId=${serviceId}&date=${date} from powershell directly because this node script doesn't fetch natively well without node-fetch.`);
}

testApi();
