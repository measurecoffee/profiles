import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTwilioClient, getVerifyService, isTwilioConfigured } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  // Check Twilio is configured
  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { error: 'Phone verification is not available' },
      { status: 503 }
    )
  }

  const { phone, code } = await request.json()

  if (!phone || !code) {
    return NextResponse.json(
      { error: 'Phone number and verification code are required' },
      { status: 400 }
    )
  }

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check the OTP via Twilio Verify
  const client = getTwilioClient()!
  const serviceSid = getVerifyService()!

  try {
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phone,
        code,
      })

    if (check.status !== 'approved') {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // OTP is valid — mark phone as verified on the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone,
        phone_verified: true,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[phone/verify] Profile update error:', updateError.message)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified',
      phone_verified: true,
    })
  } catch (err: any) {
    console.error('[phone/verify] Twilio error:', err.message)
    return NextResponse.json(
      { error: 'Verification check failed' },
      { status: 500 }
    )
  }
}