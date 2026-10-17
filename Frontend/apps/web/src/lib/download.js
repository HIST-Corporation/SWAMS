/**
 * Save a Blob as a downloaded file (Section 5: DOM work lives in the app,
 * never in shared packages). Revokes the object URL on the next tick so the
 * download has claimed it first.
 *
 * App-level because more than one feature exports a file (reports' CSV, the
 * dashboard's org snapshot) and Section 6.2 rule 1 forbids reaching into
 * another feature's folders for it.
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
