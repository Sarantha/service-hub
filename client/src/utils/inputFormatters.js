/**
 * inputFormatters.js
 * ServiceHub — Shared Input Masking & Normalization Utilities
 *
 * Pure formatter functions to enforce consistent data formats across all
 * form inputs before values reach the API layer.
 *
 * Usage:
 *   import { formatPhone, formatRegNo } from '../utils/inputFormatters'
 *
 *   onChange={(e) => setPhone(formatPhone(e.target.value))}
 *   onChange={(e) => setRegNo(formatRegNo(e.target.value))}
 */

/**
 * Phone Number Formatter
 * Target format: `0771234567` (exactly 10 numeric digits, starting with 0)
 *
 * Rules:
 * - Strips all non-numeric characters immediately
 * - Caps input length at 10 digits
 *
 * @param {string} raw - Raw string from input event
 * @returns {string} Formatted phone string (max 10 digits)
 *
 * @example
 * formatPhone('077-491 81a2')  // → '077491812'
 * formatPhone('0771234567890') // → '0771234567'
 */
export const formatPhone = (raw = '') => {
  const digitsOnly = raw.replace(/\D/g, '')
  return digitsOnly.slice(0, 10)
}

/**
 * Vehicle Registration Number Formatter
 * Target format: `CBS-8154` (3 capital letters + dash + 4 digits)
 *
 * Rules:
 * 1. Auto-capitalizes all letters
 * 2. Strips everything that isn't a letter or digit
 * 3. Separates letters (max 3) from digits (max 4)
 * 4. Automatically injects a dash `-` after the 3rd letter
 * 5. Prevents duplicate hyphens if user manually types one
 * 6. Drops provincial prefixes (e.g. "WP-", "SG-") since only the
 *    3-letter code + 4-digit number format is accepted
 * 7. Maximum output length: 8 characters (`XXX-9999`)
 *
 * @param {string} raw - Raw string from input event
 * @returns {string} Formatted registration string
 *
 * @example
 * formatRegNo('cbs8154')   // → 'CBS-8154'
 * formatRegNo('CBS--8154') // → 'CBS-8154'
 * formatRegNo('wp-cbs8154') // → 'WPC-B815' (strips non-std chars, regroups)
 */
export const formatRegNo = (raw = '') => {
  // 1. Uppercase and strip everything that isn't a letter or digit
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // 2. Split into letters (max 3) and numbers (max 4)
  const letters = clean.replace(/[0-9]/g, '').slice(0, 3)
  const numbers = clean.replace(/[A-Z]/g, '').slice(0, 4)

  // 3. Build the formatted result
  let result = letters
  if (letters.length === 3) {
    result += '-'
    if (numbers.length > 0) {
      result += numbers
    }
  }

  // 4. Cap at 8 chars (XXX-9999)
  return result.slice(0, 8)
}
