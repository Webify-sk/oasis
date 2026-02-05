'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const full_name = formData.get('full_name') as string
    const phone = formData.get('phone') as string
    const date_of_birth = formData.get('date_of_birth') as string || null

    // Helper to add if present
    const updateData: any = {
        id: user.id,
        full_name,
        phone,
        date_of_birth,
        updated_at: new Date().toISOString(),
    }

    const billing_name = formData.get('billing_name') as string;
    if (billing_name !== null) updateData.billing_name = billing_name;

    const billing_street = formData.get('billing_street') as string;
    if (billing_street !== null) updateData.billing_street = billing_street;

    const billing_city = formData.get('billing_city') as string;
    if (billing_city !== null) updateData.billing_city = billing_city;

    const billing_zip = formData.get('billing_zip') as string;
    if (billing_zip !== null) updateData.billing_zip = billing_zip;

    const billing_country = formData.get('billing_country') as string;
    if (billing_country !== null) updateData.billing_country = billing_country;

    const { error } = await supabase
        .from('profiles')
        .upsert(updateData)

    if (error) {
        console.error('Profile Update Error:', error)
        return { error: 'Failed to update profile' }
    }

    revalidatePath('/dashboard/profile')
    return { success: 'Profile updated successfully' }
}

export async function redeemVoucher(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: 'Musíte byť prihlásený.' }
    }

    const { data, error } = await supabase.rpc('redeem_voucher', {
        code_input: code
    })

    if (error) {
        console.error('Redeem Voucher Error:', error)
        return { success: false, message: 'Chyba pri uplatňovaní voucheru: ' + error.message }
    }

    // RPC returns JSON with success/message
    if (!data.success) {
        return { success: false, message: data.message }
    }

    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard/credit')
    return { success: true, message: data.message }
}
