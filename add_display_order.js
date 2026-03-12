const { Client } = require('pg');

async function applyMigration() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    });

    try {
        await client.connect();

        // Add display_order column
        await client.query(`
            ALTER TABLE public.cosmetic_services 
            ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
        `);
        console.log("Successfully added display_order column.");

        // Add comment
        await client.query(`
            COMMENT ON COLUMN public.cosmetic_services.display_order IS 'Order of visual display in UI (lower number = higher position)';
        `);
        console.log("Successfully updated column comment.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

applyMigration();
