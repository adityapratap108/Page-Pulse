'use strict';

/**
 * Validates that a given string is a syntactically correct HTTP/HTTPS URL.
 *
 * @param {string} url - The URL string to validate.
 * @returns {{ valid: boolean, reason?: string }}
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string.' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: `"${url}" is not a valid URL.` };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      valid: false,
      reason: `Protocol "${parsed.protocol}" is not supported. Only http and https are allowed.`,
    };
  }

  if (!parsed.hostname) {
    return { valid: false, reason: 'URL is missing a hostname.' };
  }

  return { valid: true };
}

module.exports = { isValidUrl };
