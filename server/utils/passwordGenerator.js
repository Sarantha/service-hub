const crypto = require('crypto');

// Excludes visually-ambiguous characters (0/O, 1/l/I) so a temp password is
// easy to read back and retype correctly when shared with a new user.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*';

const pick = (charset) => charset[crypto.randomInt(charset.length)];

/**
 * Generates a random temporary password: 10 letters + 1 digit + 1 symbol,
 * shuffled. Strong enough for a one-time credential the recipient is
 * expected to change, never logged or stored in plaintext anywhere.
 */
const generateTemporaryPassword = () => {
  const chars = [];
  for (let i = 0; i < 10; i++) chars.push(pick(LETTERS));
  chars.push(pick(DIGITS));
  chars.push(pick(SYMBOLS));

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

module.exports = { generateTemporaryPassword };
