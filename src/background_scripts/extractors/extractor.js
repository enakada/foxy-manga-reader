import * as Mangafox from './mangafox';
import * as MangaEden from './mangaeden';
import * as MangaHere from './mangahere';
import * as KissManga from './kissmanga';
import * as MangaReader from './mangareader';

const providersMap = new Map([
  ['fanfox', Mangafox],
  ['mangaeden', MangaEden],
  ['mangahere', MangaHere],
  ['kissmanga', KissManga],
  ['mangareader', MangaReader],
]);

export const regexList = [
  Mangafox.urlRegex,
  MangaEden.urlRegex,
  MangaHere.urlRegex,
  KissManga.urlRegex,
  MangaReader.urlRegex,
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
    key: `${websiteInfo[1]}/${websiteInfo[2]}`,
    extractor: providersMap.get(websiteInfo[1]),
  };
}
