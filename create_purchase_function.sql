-- Secure RPC for purchasing vouchers
-- This bypasses RLS for the insert, ensuring the server controls the credit amount based on the product.

create or replace function public.purchase_voucher(
  p_product_id uuid,
  p_code text,
  p_recipient_email text,
  p_sender_name text,
  p_message text
)
returns json
language plpgsql
security definer -- Runs with permissions of the function creator (admin)
as $$
declare
  v_user_id uuid;
  v_product record;
  v_voucher_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'Musíte byť prihlásený.');
  end if;

  -- 1. Fetch Product
  select * into v_product
  from public.voucher_products
  where id = p_product_id and is_active = true;

  if v_product.id is null then
    return json_build_object('success', false, 'message', 'Produkt sa nenašiel alebo je neaktívny.');
  end if;

  -- 2. Insert Voucher
  insert into public.vouchers (
    code,
    product_id,
    purchaser_id,
    recipient_email,
    sender_name,
    message,
    credit_amount,
    status
  ) values (
    p_code,
    v_product.id,
    v_user_id,
    p_recipient_email,
    p_sender_name,
    p_message,
    v_product.credit_amount,
    'active'
  ) returning id into v_voucher_id;

  return json_build_object(
    'success', true, 
    'message', 'Voucher úspešne vytvorený.',
    'voucher_id', v_voucher_id,
    'credit_amount', v_product.credit_amount
  );
exception when unique_violation then
  return json_build_object('success', false, 'message', 'Chyba: Kód voucheru už existuje. Skúste znova.');
when others then
  return json_build_object('success', false, 'message', 'Chyba databázy: ' || SQLERRM);
end;
$$;
