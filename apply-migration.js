const { Client } = require('pg');

async function applyMigration() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    });

    try {
        await client.connect();

        // Add category column
        await client.query(`
            ALTER TABLE public.cosmetic_services 
            ADD COLUMN IF NOT EXISTS category text DEFAULT 'beauty';
        `);
        console.log("Successfully added category column.");

        // Add comment
        await client.query(`
            COMMENT ON COLUMN public.cosmetic_services.category IS 'Category of the service (e.g., beauty, body)';
        `);
        console.log("Successfully updated column comment.");

        // Seed some defaults maybe? Wait, user has already tested save. 
        // If save failed before, defaults rule ('beauty') applies. 

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

applyMigration();
