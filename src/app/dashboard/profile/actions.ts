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

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name,
            phone,
            date_of_birth,
            updated_at: new Date().toISOString(),
        })

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
