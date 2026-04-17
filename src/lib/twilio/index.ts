import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

let _client: twilio.Twilio | null = null

export function getTwilioClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) return null
  if (!_client) {
    _client = twilio(accountSid, authToken)
  }
  return _client
}

export function getVerifyService(): string | null {
  return verifyServiceSid || null
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && verifyServiceSid)
}