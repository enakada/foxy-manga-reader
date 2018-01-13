import HttpFetch from '../../util/http';
import * as Mangafox from './mangafox';
import * as MangaEden from './mangaeden';
import * as MangaHere from './mangahere';

const providersMap = new Map([
  ['mangafox', Mangafox],
  ['mangaeden', MangaEden],
  ['mangahere', MangaHere],
]);

const regexList = [
  Mangafox.urlRegex,
  MangaEden.urlRegex,
  MangaHere.urlRegex,
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
 * Returns a promise which resolves to the new cover URL.
 * @param {string} source The name of the source to extract information from.
 * @param {string} mangaUrl The URL for the manga which to extract information from.
 * @returns Promise which resolves to the new cover URL.
 */
export async function getCurrentMangaCover(source, mangaUrl) {
  const extractor = providersMap.get(source);
  if (!extractor) return Promise.reject(Error(`Not a valid manga source: ${source}`));

  return HttpFetch(mangaUrl, extractor.getMangaCover);
}
