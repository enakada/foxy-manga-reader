import HttpRequest from '../../util/httpRequest';

/**
 * Matches the URL of a manga page.
 */
export const urlRegex = /(?:http\w*:\/\/)*(mangafox)\.\w+\/manga\/([\w_]+)\//;

/**
 * Returns the chapter reference extracted from the URL or the defaultValue.
 * @param {string} url The URL of the chapter reference to return.
 * @param {Object} defaultValue Optional. A default value in case no chapter reference could be recovered.
 * @returns A string representing the chapter reference extracted from the URL or the defaultValue.
 */
export function getChapterReference(url, defaultValue) {
  const m = /[\w:/.]+\/manga\/\w+\/(\S+)\/\d+\.html/.exec(url);
  return (m) ? { id: m[1] } : defaultValue;
}

/**
 * Returns the manga chapter list
 * @param {object} manga The manga to retrieve its chapters
 * @param {array} chapterList A default chapterList array to start from. Defaults to an empty array
 * @returns {array} The array of chapter objects.
 */
function getChapterList(mangaSid, mangaUrl, chapterList = []) {
  const url = `http://mangafox.la/media/js/list.${mangaSid}.js`;

  return HttpRequest(url, (response) => {
    const regex = /\["(.+)","([\w/.]+)"\]/g;

    let m = regex.exec(response);
    while (m !== null) {
      chapterList.push({
        id: m[2],
        name: m[1],
        url: new URL(`${m[2]}/1.html`, mangaUrl).toString(),
      });

      m = regex.exec(response);
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
  if (!url) return null;

  // Return a promise which resolves to the manga data
  return HttpRequest(url, async (response) => {
    if (!response || typeof response !== 'object') {
      throw new Error(`Mangafox response is not a HTML: ${response}`);
    }

    // Get information from url
    let m = urlRegex.exec(url);
    if (!m) throw new Error(`Invalid url for mangafox: ${url}`);

    const mangaUrl = m[0];
    const mangaReference = m[2];

    const headerDom = response.getElementsByTagName('head')[0];

    // Get manga name from response
    const titleDom = response.evaluate('//meta[@property="og:title"]', headerDom, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (!titleDom.singleNodeValue) throw new Error('Mangafox: could not find DOM with property og:title');

    const name = /([\w\s]+) (?:[\d.]+ Page \d+|Manga)/.exec(titleDom.singleNodeValue.getAttribute('content'))[1];

    const chapterRef = getChapterReference(url);

    // Get manga SID and image URL from response
    let imageUrl;
    if (!chapterRef) {
      const imageDom = response.evaluate('//div[@class="cover"]/img', headerDom, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (!imageDom.singleNodeValue) throw new Error('Mangafox: could not find <img> DOM with "cover" class');

      imageUrl = imageDom.singleNodeValue.getAttribute('src');
    } else {
      const imageDom = response.evaluate('//meta[@property="og:image"]', headerDom, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (!imageDom.singleNodeValue) throw new Error('Mangafox: could not find DOM with property og:image');

      imageUrl = imageDom.singleNodeValue.getAttribute('content');
    }

    m = /\S+\/manga\/(\d+)\S+/.exec(imageUrl);
    if (!m) throw new Error('Could not extract SID information from Mangafox response object');

    const sid = m[1];

    // Get chapter list and return
    try {
      const chapterList = await getChapterList(sid, mangaUrl);

      // Create the manga object
      const manga = {
        sid,
        name,
        source: 'mangafox',
        reference: mangaReference,
        url: mangaUrl,
        cover: imageUrl,
        last_update: new Date(),
        chapter_list: chapterList,
      };

      return manga;
    } catch (err) {
      throw new Error(`Error while retrieving chapter list: ${err}`);
    }
  });
}

/**
 * Updates the current chapter list for a manga. Also returns the number of new chapters found
 * @param {object} manga The manga to update.
 * @returns {object} The updated manga object.
 */
export async function updateChapters(manga) {
  try {
    const chapterList = await getChapterList(manga.sid, manga.url);

    const data = {
      count: chapterList.length - manga.chapter_list.length,
      chapterList,
    };

    return data;
  } catch (err) {
    throw new Error(`Error while retrieving chapter list: ${err}`);
  }
}
