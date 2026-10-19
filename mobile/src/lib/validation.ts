// Client-side form validation (quick feedback only).
// The server checks all of this again in backend/src/Validation/Validator.php.

export const PASSWORD_MIN = 16;
export const PASSWORD_MAX = 128;

// Same list as the server.
const COMMON_PASSWORDS = [
  'password12345678', 'password123456789', 'passw0rd12345678', 'passwordpassword1',
  'qwerty1234567890', 'qwertyuiop123456', 'letmein123456789', 'welcome123456789',
  'admin12345678901', 'iloveyou12345678', 'abcd1234abcd1234', 'abc1234567890123',
];

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 100) return 'Enter your full name (2 to 100 characters).';
  if (/[<>\u0000-\u001f\u007f]/.test(name)) return 'Name contains characters that are not allowed.';
  return null;
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Enter your email address.';
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string, email = ''): string | null {
  if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters long.`;
  if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters long.`;
  const hasLetter = /[A-Za-zÀ-ɏͰ-￿]/.test(value);
  const hasDigit = /\d/.test(value);
  if (!hasLetter || !hasDigit) return 'Password must contain at least one letter and one number.';
  const lower = value.toLowerCase();
  if (COMMON_PASSWORDS.includes(lower) || (email && lower === normalizeEmail(email))) {
    return 'That password is too easy to guess. Choose a different one.';
  }
  return null;
}

export function validateOtp(value: string): string | null {
  return /^\d{6}$/.test(value.trim()) ? null : 'Enter the 6-digit code.';
}
