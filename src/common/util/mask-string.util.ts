/**
 * Masks a string, leaving only the last N characters visible
 *
 * @param value - The string to mask
 * @param visibleChars - Number of characters to leave visible at the end (default: 4)
 * @param maskChar - Character to use for masking (default: '*')
 * @param preservePrefix - Number of characters to preserve at the start (optional)
 *
 * @example
 * maskString('+37369313123', 4)           // '+373*****3123'
 * maskString('+37369313123', 4, '*', 4)   // '+373*****3123'
 * maskString('user@example.com', 4)       // '***********.com'
 * maskString('1234567890', 4)             // '******7890'
 */
export function maskString(
  value: string,
  visibleChars: number = 4,
  maskChar: string = '*',
  preservePrefix?: number,
): string {
  if (!value || value.length === 0) {
    return '';
  }

  // If string is too short to mask meaningfully
  if (value.length <= visibleChars) {
    return maskChar.repeat(value.length);
  }

  const lastChars = value.slice(-visibleChars);

  if (preservePrefix && preservePrefix > 0) {
    const prefix = value.slice(0, preservePrefix);
    const maskedLength = value.length - preservePrefix - visibleChars;
    const masked = maskedLength > 0 ? maskChar.repeat(maskedLength) : '';

    return `${prefix}${masked}${lastChars}`;
  }

  const maskedLength = value.length - visibleChars;
  const masked = maskChar.repeat(maskedLength);

  return `${masked}${lastChars}`;
}
