import { formatDateAd } from '@swams/i18n';

/**
 * "20 Oct → 22 Oct", or a single day when start and end match.
 *
 * AD only until a verified BS converter lands (contract request 1); this
 * formatter never invents a Bikram Sambat date.
 *
 * @param {string} start ISO `YYYY-MM-DD`
 * @param {string} end ISO `YYYY-MM-DD`
 * @param {'en-GB'|'ne-NP'} locale
 * @returns {string}
 */
export function formatRange(start, end, locale) {
  const day = (iso) => formatDateAd(new Date(`${iso}T12:00:00.000Z`), { locale });
  return start === end ? day(start) : `${day(start)} → ${day(end)}`;
}
