/**
 * Normalize a phone number to E.164 format.
 * Defaults to US (+1) if no country code is provided.
 * 
 * Examples:
 *   "5551234567"    → "+15551234567"
 *   "15551234567"   → "+15551234567"
 *   "+15551234567"  → "+15551234567"
 *   "+441234567890" → "+441234567890"
 *   "(555) 123-4567" → "+15551234567"
 */
export function normalizePhone(input: string): string {
  // Strip all non-digit characters except leading +
  let stripped = input.replace(/[^\d+]/g, '')
  
  if (stripped.startsWith('+')) {
    // Already has country code — return as-is
    return stripped
  }
  
  // No country code — assume US (+1)
  // Remove leading 1 if they typed it (e.g. 1-555-123-4567)
  if (stripped.startsWith('1') && stripped.length === 11) {
    stripped = stripped.slice(1)
  }
  
  return `+1${stripped}`
}

/**
 * Validate that a phone number looks like a valid E.164 number.
 * Minimum 8 digits after the +, maximum 15.
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone)
}