import { ErrorCode, getError as FoxyError } from '../../util/foxyErrors';
import HttpFetch from '../../util/http';

/**
 * Matches the URL of a manga page.
 */
export const urlRegex = /(?:https*:\/\/[\w.]*)*(mangahere)\.\w{2,3}\/manga\/([\w_]+)\//;

/**
 * Returns the chapter reference extracted from the URL or the defaultValue.
 * @param {string} url The URL of the chapter reference to return.
 * @param {Object} defaultValue Optional. A default value in case no chapter reference could be recovered.
 * @returns A string representing the chapter reference extracted from the URL or the defaultValue.
 */
export function getChapterReference(url, defaultValue) {
  const m = /[\w:/.]+\/manga\/\w+\/([\dvc/.]+)\/(?:\d+\.html)*/.exec(url);
  return (m) ? { id: m[1] } : defaultValue;
}

/**
 * Returns the Manga cover URL from the manga main page.
 * @param {object} response The Fetch API response object.
 * @param {string} url Optional. The URL to print with errors.
 * @returns String representing the manga cover URL.
 */
export function getMangaCover(response, url) {
  if (!response || typeof response !== 'object') {
    throw FoxyError(ErrorCode.RESPONSE_NOT_HTML, url);
  }

  // Get manga image URL from response
  const imageDom = response.evaluate('//div[contains(@class,"manga_detail_top clearfix")]/img', response, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  if (!imageDom.singleNodeValue) throw FoxyError(ErrorCode.NO_MANGA_COVER, url);

  return imageDom.singleNodeValue.getAttribute('src');
}

/**
 * Returns the manga chapter list
 * @param {object} manga The manga to retrieve its chapters
 * @param {array} chapterList A default chapterList array to start from. Defaults to an empty array
 * @returns {array} The array of chapter objects.
 */
function getChapterList(mangaSid, mangaUrl, chapterList = []) {
  const url = `http://www.mangahere.cc/get_chapters${mangaSid}.js`;

  return HttpFetch(url, (response) => {
    const regex = /\["(.+)","[\w./"+]+"\/([vc/\d.]+)\/"\]/g;

    const body = response.body.innerHTML;
    if (!body) return chapterList;

    let m = regex.exec(body);
    while (m !== null) {
      chapterList.push({
        id: m[2],
        name: m[1],
        url: new URL(`${m[2]}/`, mangaUrl).toString(),
      });

      m = regex.exec(body);
    }

    return chapterList;
  });
}

/**
 * Returns the manga information
 * @param {string} url The URL for the manga.
 * @returns {Promise} A promise which resolves to the manga object retrieved.
 */
export function getMangaInfo(url) {
  // Sanity check
  if (!url) return Promise.reject(new TypeError('getMangaInfo() argument is null'));

  // Get information from url
  let m = urlRegex.exec(url);
  if (!m) return Promise.reject(FoxyError(ErrorCode.UNPARSE_URL, url));

  const mangaUrl = m[0];
  const mangaReference = m[2];

  // Return a promise which resolves to the manga data
  return HttpFetch(mangaUrl, async (response) => {
    if (!response || typeof response !== 'object') {
      throw FoxyError(ErrorCode.RESPONSE_NOT_HTML, mangaUrl);
    }

    const headerDom = response.getElementsByTagName('head')[0];

    // Get manga name from response
    const titleDom = response.evaluate('//meta[@property="og:title"]', headerDom, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (!titleDom.singleNodeValue) throw FoxyError(ErrorCode.NO_MANGA_NAME, mangaUrl);

    const name = titleDom.singleNodeValue.getAttribute('content');

    // Get manga SID and image URL from response
    const imageUrl = getMangaCover(response, mangaUrl);

    m = /\S+\/manga\/(\d+)\S+/.exec(imageUrl);
    if (!m) throw FoxyError(ErrorCode.NO_MANGA_SID, mangaUrl);

    const sid = m[1];

    // Get chapter list and return
    try {
      const chapterList = await getChapterList(sid, mangaUrl);

      // Create the manga object
      const manga = {
        sid,
        name,
        source: 'mangahere',
        reference: mangaReference,
        url: mangaUrl,
        cover: imageUrl,
        last_update: new Date(),
        chapter_list: chapterList,
      };

      return manga;
    } catch (err) {
      throw err;
    }
  });
}

/**
 * Updates the current chapter list for a manga. Also returns the number of new chapters found
 * @param {object} manga The manga to update.
 * @returns {object} The updated manga object.
 */
export async function updateChapters(manga) {
  if (!manga || !manga.url || !manga.sid || !manga.chapter_list) {
    throw new TypeError(`updateChapters() argument is invalid: ${JSON.stringify(manga)}`);
  }

  try {
    const chapterList = await getChapterList(manga.sid, manga.url);

    const data = {
      count: chapterList.length - manga.chapter_list.length,
      chapterList,
    };

    return data;
  } catch (err) {
    throw err;
  }
}
