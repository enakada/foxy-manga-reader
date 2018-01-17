// TODO: Internationalize error message
export const ErrorCode = {
  // Internal add-on related errors
  UNPARSE_URL: [100, 'Cannot Parse Manga URL'],
  WRONG_MANGA_URL: [101, 'Cannot Get Manga Information'],
  NO_MANGA_NAME: [102, 'Cannot Find Manga Name'],
  NO_MANGA_SID: [103, 'Cannot Find Manga SID'],
  NO_MANGA_COVER: [104, 'Cannot Find Manga Cover'],
  STORE_ERROR: [105, 'Cannot Find Bookmarked Manga Data'],
  NO_CHAPTER_REF: [106, 'Cannot Extract Chapter Reference'],
  NO_BOOKMARK_ERROR: [107, 'Cannot Find Manga Bookmark'],
  INVALID_SOURCE: [108, 'Invalid Manga Source'],
  NO_STORAGE_BOOKMARK: [109, 'Cannot Find the Bookmark List'],

  // DOM Related errors
  DOM_MISSING: [200, 'DOM Missing From Page'],

  // Network related errors
  RESPONSE_NOT_HTML: [300, 'HTTP Response was not HTML'],
  SOURCE_SERVER_ERROR: [301, 'Source Error'],
  SOURCE_CLIENT_ERROR: [302, 'Source Content Changed'],
};

/**
 * Returns a new error object with the custom error message.
 * @param {array} key The key of the error to return from the error map.
 * @returns Returns the error object associated with the specified key or undefined.
 */
export function getError(errCode, params = {}) {
  // Default error
  if (!errCode) return new Error('Foxy Error #500 - Internal Add-on Error');

  const [code, message] = errCode;

  const err = new Error(`Foxy Error #${code} - ${message}`);
  err.code = code;
  err.params = params;

  return err;
}
