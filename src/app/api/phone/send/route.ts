import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTwilioClient, getVerifyService, isTwilioConfigured } from '@/lib/twilio'
import { normalizePhone, isValidE164 } from '@/lib/phone'

export async function POST(request: NextRequest) {
  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { error: 'Phone verification is not available' },
      { status: 503 }
    )
  }

  const { phone: rawPhone } = await request.json()

  if (!rawPhone || typeof rawPhone !== 'string') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }

  const phone = normalizePhone(rawPhone)

  if (!isValidE164(phone)) {
    return NextResponse.json(
      { error: 'Invalid phone number format. Enter a 10-digit US number or include country code.' },
      { status: 400 }
    )
  }

  // Auth check — user must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check if this phone is already verified by another account
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .maybeSingle()

  if (existingProfile && existingProfile.user_id !== user.id) {
    return NextResponse.json(
      { error: 'This phone number is already verified on another account' },
      { status: 409 }
    )
  }

  // Send verification SMS via Twilio Verify
  const client = getTwilioClient()!
  const serviceSid = getVerifyService()!

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phone,
        channel: 'sms',
      })

    if (verification.status === 'pending') {
      return NextResponse.json({ success: true, message: 'Verification code sent' })
    }

    return NextResponse.json(
      { error: `Unexpected verification status: ${verification.status}` },
      { status: 500 }
    )
  } catch (err: any) {
    console.error('[phone/send] Twilio error:', err.message)
    return NextResponse.json(
      { error: 'Failed to send verification code. Please check the phone number and try again.' },
      { status: 500 }
    )
  }
}