import { ErrorCode, getError as FoxyError } from '../../util/foxyErrors';
import HttpFetch from '../../util/http';

/**
 * Matches the URL of a manga page.
 */
export const urlRegex = /(?:https*:\/\/[\w.]*)*(kissmanga)\.\w{2,3}\/Manga\/([\w-]+)/;

/**
 * Returns the chapter reference extracted from the URL or the defaultValue.
 * @param {string} url The URL of the chapter reference to return.
 * @param {Object} defaultValue Optional. A default value in case no chapter reference could be recovered.
 * @returns A string representing the chapter reference extracted from the URL or the defaultValue.
 */
export function getChapterReference(url, defaultValue) {
  const m = /[\w:/.]+\/Manga\/[\w-]+\/([\S]+\?id=\d+)/.exec(url);
  return (m) ? { id: m[1] } : defaultValue;
}

/**
 * Returns the Manga cover URL from the manga main page.
 * @param {object} response The Fetch API response object.
 * @param {string} url Optional. The URL to print with errors.
 * @returns String representing the manga cover URL.
 */
export function getMangaCover(response, url) {
  const imageDom = response.evaluate('//link[@rel="image_src"]', response, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  if (!imageDom.singleNodeValue) throw FoxyError(ErrorCode.NO_MANGA_COVER, url);

  return imageDom.singleNodeValue.getAttribute('href');
}

/**
 * Returns the Manga status (Ongoing|Completed) from the manga main page.
 * @param {object} response The Fetch API response object.
 * @param {string} url Optional. The URL to print with errors.
 * @returns {boolean} True if the series is stated as 'Completed' and False otherwise.
 */
export function getMangaStatus(response, url) {
  const imageDom = response.evaluate('//div[@id="leftside"]//div[@class="barContent"]/div[2]', response, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  if (!imageDom.singleNodeValue) throw FoxyError(ErrorCode.NO_MANGA_STATUS, url);

  const statusStr = /Status:\s(\w+)/.exec(imageDom.singleNodeValue.textContent);
  if (!statusStr) throw FoxyError(ErrorCode.NO_MANGA_STATUS, url);

  return (statusStr[1] === 'Completed');
}

/**
 * Returns the manga chapter list
 * @param {object} mangaUrl The manga URL to retrieve its chapters.
 * @param {array} dom The document DOM to parse (if any).
 * @returns {array} The array of chapter objects.
 */
function getChapterList(mangaUrl, dom, chapterList = []) {
  const parseFn = (doc) => {
    const container = doc.getElementById('leftside');
    if (!container) return chapterList;

    const rowIterator = doc.evaluate('//table//tr/td/a', container, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

    try {
      let rowNode = rowIterator.iterateNext();
      if (!rowNode) return chapterList;

      while (rowNode) {
        const { href } = rowNode;
        const id = /Manga\/[\w-]+\/(.+\?id=\d+)/.exec(href)[1];

        chapterList.push({
          id,
          name: rowNode.textContent,
          url: new URL(id, `${mangaUrl}/`).toString(),
        });

        rowNode = rowIterator.iterateNext();
      }
    } catch (err) {
      throw Error(`Document tree modified during iteration (${mangaUrl}): ${err}`);
    }

    return chapterList.reverse();
  };

  if (dom) return Promise.resolve(parseFn(dom));

  return HttpFetch(mangaUrl, (response) => {
    if (!response || typeof response !== 'object') {
      throw FoxyError(ErrorCode.RESPONSE_NOT_HTML, mangaUrl);
    }

    return parseFn(response);
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
  const m = urlRegex.exec(url);
  if (!m) return Promise.reject(FoxyError(ErrorCode.UNPARSE_URL, url));

  const mangaUrl = m[0];
  const mangaReference = m[2];
  const sid = mangaReference;

  // Return a promise which resolves to the manga data
  return HttpFetch(mangaUrl, async (response) => {
    if (!response || typeof response !== 'object') {
      throw FoxyError(ErrorCode.RESPONSE_NOT_HTML, mangaUrl);
    }

    const headerDom = response.getElementsByTagName('head')[0];

    // Get manga name from response
    const titleDom = response.evaluate('//meta[@name="description"]', headerDom, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (!titleDom.singleNodeValue) throw FoxyError(ErrorCode.NO_MANGA_NAME, mangaUrl);

    const name = titleDom.singleNodeValue.getAttribute('content').replace(/Read (.+) manga .+/, '$1');

    // Get image URL and status from response
    const imageUrl = getMangaCover(response, mangaUrl);
    const status = getMangaStatus(response, mangaUrl);

    // Get chapter list and return
    try {
      const chapterList = await getChapterList(mangaUrl, response);

      // Create the manga object
      const manga = {
        sid,
        name,
        source: 'kissmanga',
        reference: mangaReference,
        url: mangaUrl,
        cover: imageUrl,
        status,
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
    const chapterList = await getChapterList(manga.url);

    const data = {
      count: chapterList.length - manga.chapter_list.length,
      chapterList,
    };

    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Returns the manga information
 * @param {object} manga The manga to update.
 * @returns {Promise} A promise which resolves to the manga object retrieved.
 */
export async function updateMetadata(manga) {
  if (!manga || !manga.url) {
    throw new TypeError(`updateMetadata() argument is invalid: ${JSON.stringify(manga)}`);
  }

  return HttpFetch(manga.url, async (response) => {
    if (!response || typeof response !== 'object') {
      throw FoxyError(ErrorCode.RESPONSE_NOT_HTML, manga.url);
    }

    const update = {
      cover: getMangaCover(response, manga.url),
      status: getMangaStatus(response, manga.url),
    };

    return update;
  });
}
