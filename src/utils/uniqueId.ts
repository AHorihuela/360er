/**
 * Generates a short unique ID for feedback links
 * Uses a combination of timestamp and random characters
 * Format: 8 characters long, base62 (alphanumeric)
 */
export function generateShortId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const length = 8;
  let result = '';
  
  // Get current timestamp in base36 (2 chars)
  const timestamp = Math.floor(Date.now() / 1000).toString(36).slice(-2);
  result += timestamp;
  
  // Add 6 random characters
  for (let i = 0; i < length - 2; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  
  return result;
}