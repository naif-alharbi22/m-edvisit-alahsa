import { randomInt } from "node:crypto";

// Crockford-style alphabet without ambiguous characters (0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Generates a short human-friendly reference such as "AP-7K3P9Q". */
export function generateReference(prefix: "AP" | "HB", length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}
