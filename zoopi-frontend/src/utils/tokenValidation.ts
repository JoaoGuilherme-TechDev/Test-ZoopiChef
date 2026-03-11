// Token prefix validation utilities

export type TokenType = 'menu' | 'tv' | 'roleta';

export const TOKEN_PREFIXES: Record<TokenType, string> = {
  menu: 'm_',
  tv: 'tv_',
  roleta: 'r_',
};

/**
 * Validates if a token has the correct prefix for its type
 */
export function validateTokenPrefix(token: string | undefined, expectedType: TokenType): boolean {
  if (!token) return false;
  const expectedPrefix = TOKEN_PREFIXES[expectedType];
  return token.startsWith(expectedPrefix);
}

/**
 * Extracts the token type from a prefixed token
 */
export function getTokenType(token: string): TokenType | null {
  if (token.startsWith('tv_')) return 'tv';
  if (token.startsWith('m_')) return 'menu';
  if (token.startsWith('r_')) return 'roleta';
  return null;
}

/**
 * Checks if token is legacy (no prefix) - for backwards compatibility
 */
export function isLegacyToken(token: string): boolean {
  return !token.includes('_');
}
