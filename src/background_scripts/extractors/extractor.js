import * as Mangafox from './mangafox';
import * as MangaEden from './mangaeden';

const providersMap = new Map([
  ['mangafox', Mangafox],
  ['mangaeden', MangaEden],
]);

const regexList = [
  Mangafox.urlRegex,
  MangaEden.urlRegex,
];

/**
 * Parses the url and return and object defining the manga.
 * @param {string} url The URL to parse
 * @returns {object} An object containing providersMap key information,
 *  extractor and storage reference key.
 */
export function parseUrl(url) {
  const regex = regexList.filter(re => re.test(url));
  if (!regex || regex.length === 0) return null;

  const websiteInfo = regex[0].exec(url);

  return {
    website: websiteInfo[1],
    reference: websiteInfo[2],
    extractor: providersMap.get(websiteInfo[1]),
  };
}

/**
 * Returns the list of chapters of a manga.
 * @param {object} manga The manga to search for chapters.
 * @returns {object} An array of objects defining all chapters of a manga.
 */
export function getChapterList(manga) {
  const extractor = providersMap.get(manga.source);
  if (!extractor) return null;

  return extractor.getChapterList(manga);
}
