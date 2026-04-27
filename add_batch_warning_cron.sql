-- Pridanie stĺpca warning_sent do tabuľky credit_batches
-- Tento stĺpec zabezpečí, že upozornenie o expirácii odošleme zákazníkovi pre jeho dávku iba jedenkrát.

ALTER TABLE public.credit_batches
ADD COLUMN IF NOT EXISTS warning_sent BOOLEAN DEFAULT false;

-- Možnosť pre administrátora skontrolovať to v Supabase Dashboarde
COMMENT ON COLUMN public.credit_batches.warning_sent IS 'Flag used to track if a 7-day expiration warning email has been sent for this batch.';
