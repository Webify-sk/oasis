-- Vytvorenie tabuľky pre zľavové kupóny
CREATE TABLE public.discount_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Zabezpečenie tabuľky (Row Level Security)
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Pridanie RLS politík
-- Iba zamestnanci môžu spravovať (vytvárať/čítať všetky) kupóny
CREATE POLICY "Employees can manage discount_coupons" 
ON public.discount_coupons 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'employee')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'employee')
  )
);

-- Zákazníci môžu vidieť a uplatniť vlastný (cieľový) kupón
CREATE POLICY "Users can view and update their target coupons" 
ON public.discount_coupons 
FOR SELECT 
TO authenticated 
USING (
    target_user_id = auth.uid()
);

CREATE POLICY "Users can update their target coupons" 
ON public.discount_coupons 
FOR UPDATE 
TO authenticated 
USING (
    target_user_id = auth.uid()
)
WITH CHECK (
    target_user_id = auth.uid()
);
