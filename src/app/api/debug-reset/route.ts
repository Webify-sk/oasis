import { resetPassword } from '@/app/auth/actions';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || 'bkone@example.com';

    console.log(`Triggering reset for ${email}`);
    const result = await resetPassword(email);
    console.log('Reset Result:', result);

    return new Response(JSON.stringify(result));
}
