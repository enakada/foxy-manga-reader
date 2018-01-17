import { ErrorCode, getError as FoxyError } from '../util/foxyErrors';
import * as Extractor from './extractors/extractor';
import * as Notification from '../util/notification';
import store from '../util/datastore';

// Core Methods
// ////////////////////////////////////////////////////////////////

/**
 * Bookmarks a new manga.
 * - Get extractor from URL
 * - Get Manga Info
 * - Get current chapter info, if any, or save first chapter
 * - save manga reference (and cur_chapter) to storage.sync
 * - Save manga info to indexedDB
 * @param {string} url The url of the manga.
 * @param {object} bookmark The bookmark object of a previous backup.
 * @returns {Promise} A promise which resolves to the manga object.
 */
async function bookmarkManga(url, bookmark) {
  try {
    const info = Extractor.parseUrl(url);
    if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, url);

    const manga = await info.extractor.getMangaInfo(url);
    if (!manga) throw FoxyError(ErrorCode.WRONG_MANGA_URL, url);

    // Save manga information
    await store.setItem(`${manga.source}/${manga.reference}`, manga);

    const storage = await browser.storage.sync.get('bookmark_list');

    if (bookmark) {
      storage.bookmark_list.push(bookmark);
    } else {
      const currentChapter = info.extractor.getChapterReference(url, manga.chapter_list[0]);
      if (!currentChapter.index) {
        const index = manga.chapter_list.findIndex(elem => elem.id === currentChapter.id);
        currentChapter.index = index;
      }

      storage.bookmark_list.push({
        source: manga.source,
        reference: manga.reference,
        url: manga.url,
        last_read: {
          date: new Date(),
          chapter: currentChapter,
        },
      });
    }

    // Sort bookmark_list
    storage.bookmark_list.sort((a, b) => {
      const refA = a.reference.toUpperCase();
      const refB = b.reference.toUpperCase();
      if (refA < refB) return -1;
      if (refA > refB) return 1;
      return 0;
    });

    // Save bookmark to storage.sync
    await browser.storage.sync.set(storage);

    return Promise.resolve(manga);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Unbookmarks a manga.
 * - Get extractor from URL
 * - Remove manga data from storage.sync
 * - Remove manga data from indexeddb
 * @param {string} url The url of the manga.
 * @returns {Promise} A promise which resolves to true if manga was unbookmarked.
 */
async function unbookmarkManga(url) {
  try {
    const info = Extractor.parseUrl(url);
    if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, url);

    const storage = await browser.storage.sync.get('bookmark_list');

    // Remove from storage.sync
    const index = storage.bookmark_list.findIndex((elem) => {
      return elem.source === info.website && elem.reference === info.reference;
    });

    if (index > -1) {
      storage.bookmark_list.splice(index, 1);
      await browser.storage.sync.set(storage);
    }

    // Remove from indexdb
    await store.removeItem(`${info.website}/${info.reference}`);

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Updates the last read chapter to the URL defined chapter.
 * - Get extractor from URL
 * - Get last_read information from storage.sync
 * - Check if current chapter is higher than the storage
 * - Update the storage
 * @param {string} url The url of the manga.
 * @returns {Promise} A promise which resolves to true if a manga was updated.
 */
async function updateCurrentChapter(url) {
  try {
    const info = Extractor.parseUrl(url);
    if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, url);

    const storage = await browser.storage.sync.get('bookmark_list');
    const index = storage.bookmark_list.findIndex((elem) => {
      return elem.source === info.website && elem.reference === info.reference;
    });

    if (index < 0) return Promise.resolve(false);

    const manga = await store.getItem(`${info.website}/${info.reference}`);
    if (!manga) throw FoxyError(ErrorCode.STORE_ERROR, `${info.website}/${info.reference}`);

    const chapter = info.extractor.getChapterReference(url);
    if (!chapter) throw FoxyError(ErrorCode.NO_CHAPTER_REF, url);

    const chapterIndex = manga.chapter_list.findIndex(elem => elem.id === chapter.id);

    // If manga order < current chapter
    const lastChapterRead = storage.bookmark_list[index].last_read.chapter;
    if (chapterIndex > lastChapterRead.index) {
      storage.bookmark_list[index].last_read.chapter.id = chapter.id;
      storage.bookmark_list[index].last_read.chapter.index = chapterIndex;

      await browser.storage.sync.set(storage);

      // Send message to update current chapter
      browser.runtime.sendMessage({
        type: 'update-current-chapter',
        bookmark: storage.bookmark_list[index],
      });
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  } catch (err) {
    return Promise.reject(err);
  }
}


// On Installation
// ////////////////////////////////////////////////////////////////

/**
 * Initializes the storage data when extension is installed.
 */
async function init() {
  try {
    const storage = await browser.storage.sync.get();

    // v0.4.0 transition - inclusion of manga list view mode
    if (typeof storage.view_mode === 'string') {
      await browser.storage.sync.set({
        view_mode: {
          manga: storage.view_mode,
        },
      });
    }

    if (storage.bookmark_list) return;

    // await store.clear(); // Debugging and development
    await browser.storage.sync.set({
      bookmark_list: [],
      badge_count: 0,
      view_mode: {},
    });
  } catch (err) {
    console.error(`An error occurred while initializing extension: ${err}`); // eslint-disable-line no-console
  }
}

browser.runtime.onInstalled.addListener(init);


// Alarms
// ////////////////////////////////////////////////////////////////

/**
 * Runs on the background and updates all bookmarked manga chapters.
 * @param {alarms.Alarm} alarm The alarm that fired.
 */
async function updateMangaChapterList(alarm) {
  if (alarm.name !== 'background_update') return;

  try {
    const storage = await browser.storage.sync.get(['bookmark_list', 'badge_count']);

    const keys = await store.keys();
    if (!keys) return; // no manga to track

    keys.forEach(async (key) => {
      const manga = await store.getItem(key);

      console.log(`Checking updates for '${manga.name}'`);

      const info = Extractor.parseUrl(manga.url);
      if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, manga.url);

      const { count, chapterList } = await info.extractor.updateChapters(manga);
      const index = storage.bookmark_list.findIndex((elem) => {
        return elem.source === manga.source && elem.reference === manga.reference;
      });

      if (index < 0) throw FoxyError(ErrorCode.NO_BOOKMARK_ERROR, manga.name);

      // Update current chapter tracker
      const lastReadCh = storage.bookmark_list[index].last_read.chapter;
      const lastReadIndex = chapterList.findIndex(elem => elem.id === lastReadCh.id);
      if (lastReadIndex < 0) {
        storage.bookmark_list[index].last_read.chapter.id = chapterList[lastReadCh.index].id;
      } else if (lastReadIndex !== lastReadCh.index) {
        storage.bookmark_list[index].last_read.chapter.index = lastReadIndex;
      }

      // Update cover if it changed
      const coverUrl = await Extractor.getCurrentMangaCover(manga.source, manga.url);
      if (coverUrl && coverUrl !== manga.cover) manga.cover = coverUrl;

      // Update db
      const mangaCopy = Object.assign(manga, { chapter_list: chapterList });
      await store.setItem(`${info.website}/${info.reference}`, mangaCopy);

      if (count <= 0) return; // no new chapters

      // Trigger notifications
      Notification.inform({
        title: browser.i18n.getMessage('mangaChapterUpdateNotificationTitle'),
        message: browser.i18n.getMessage('mangaChapterUpdateNotificationMessage', [count, manga.name]),
      });

      // Update badge count
      storage.badge_count += count;
      browser.browserAction.setBadgeBackgroundColor({ color: 'red' });
      browser.browserAction.setBadgeText({ text: storage.badge_count.toString() });

      // Send message to update chapter list
      browser.runtime.sendMessage({
        type: 'update-chapter-list',
        bookmark: storage.bookmark_list[index],
        chapterList,
      });

      // Update storage
      await browser.storage.sync.set(storage);
    });

    await browser.storage.sync.set({ last_chapter_update: new Date() });
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
  }
}

browser.alarms.onAlarm.addListener(updateMangaChapterList);

browser.alarms.create('background_update', {
  delayInMinutes: 1,
  periodInMinutes: 30, // Every 30 minutes
});


// Page Actions
// ////////////////////////////////////////////////////////////////

/**
 * Displays the Bookmark icon.
 * @param {integer} tabId The ID of the tab whose icon you want to set.
 */
function displayBookmarkIcon(tabId) {
  browser.pageAction.setTitle({ tabId, title: browser.i18n.getMessage('bookmarkIconTitle') });
  browser.pageAction.setIcon({
    tabId,
    path: {
      32: 'icons/fmr-transp-plus-32.png',
      64: 'icons/fmr-transp-plus-64.png',
    },
  });
}

/**
 * Displays the Unbookmark icon.
 * @param {integer} tabId The ID of the tab whose icon you want to set.
 */
function displayUnbookmarkIcon(tabId) {
  browser.pageAction.setTitle({ tabId, title: browser.i18n.getMessage('unbookmarkIconTitle') });
  browser.pageAction.setIcon({
    tabId,
    path: {
      32: 'icons/fmr-transp-minus-32.png',
      64: 'icons/fmr-transp-minus-64.png',
    },
  });
}

/**
 * Bookmarks a new Manga when pageAction is clicked.
 * @param {Tabs.tab} tab A tabs.Tab object representing the tab whose page action was clicked.
 */
async function bookmarkActionListener(tab) {
  try {
    const manga = await bookmarkManga(tab.url);
    if (manga) {
      // Notify user
      Notification.inform({
        title: browser.i18n.getMessage('bookmarkMangaNotificationTitle'),
        message: browser.i18n.getMessage('bookmarkMangaNotificationMessage', manga.name),
      });

      // Change action page icon
      displayUnbookmarkIcon(tab.id);
    }
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
}

/**
 * Unbookmarks a Manga when pageAction is clicked.
 * @param {Tabs.tab} tab A tabs.Tab object representing the tab whose page action was clicked.
 */
async function unbookmarkActionListener(tab) {
  try {
    const manga = await unbookmarkManga(tab.url);
    if (manga) {
      // Notify user
      Notification.inform({
        title: browser.i18n.getMessage('unbookmarkMangaNotificationTitle'),
        message: browser.i18n.getMessage('unbookmarkMangaNotificationMessage'),
      });

      // Change action page icon
      displayBookmarkIcon(tab.id);
    }
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
}

browser.pageAction.onClicked.addListener(async (tab) => {
  try {
    const pageActionTitle = await browser.pageAction.getTitle({ tabId: tab.id });
    if (pageActionTitle === browser.i18n.getMessage('bookmarkIconTitle')) {
      bookmarkActionListener(tab);
    } else {
      unbookmarkActionListener(tab);
    }
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
});

/**
 * Listens to tab updates and show pageAction on manga pages.
 * @param {integer} tabId ID of the tab that was updated.
 * @param {object} changeInfo Contains properties for the tab properties that have changed.
 * @param {tabs.Tab} tab The new state of the tab.
 */
async function pageActionListener(tabId, changeInfo) {
  // Only run if URL changed
  if (!changeInfo.url) return;

  // Check if new tab URL is a tracked URL
  const info = Extractor.parseUrl(changeInfo.url);
  if (!info) return;

  // console.debug(`Called page action listener on new tab ${changeInfo.url}`);

  try {
    const storage = await browser.storage.sync.get('bookmark_list');

    const index = storage.bookmark_list.findIndex((elem) => {
      return elem.source === info.website && elem.reference === info.reference;
    });

    if (index < 0) { // not bookmarked
      displayBookmarkIcon(tabId);
    } else { // bookmarked
      displayUnbookmarkIcon(tabId);
    }

    // Show Icon
    await browser.pageAction.show(tabId);
  } catch (err) {
    console.error(`pageActionListener(): ${err}`); // eslint-disable-line no-console
  }
}

browser.tabs.onUpdated.addListener(pageActionListener);


// Database restoration
// ////////////////////////////////////////////////////////////////

/**
 * Imports a manga. If manga bookmark already exists, just update the values.
 * @param {object} bookmark The manga bookmark information to import
 */
async function importManga(bookmark) {
  try {
    const storage = await browser.storage.sync.get('bookmark_list');
    const index = storage.bookmark_list.findIndex((elem) => {
      return elem.source === bookmark.source && elem.reference === bookmark.reference;
    });

    if (index !== -1) {
      storage.bookmark_list[index] = bookmark;
      await browser.storage.sync.set(storage);
    } else {
      await bookmarkManga(bookmark.url, bookmark);
    }

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
}

// Runtime messages
// ////////////////////////////////////////////////////////////////

browser.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.type) {
    case 'bookmark':
      return (sender.tab) ? bookmarkActionListener(sender.tab) : bookmarkManga(message.manga_url);
    case 'unbookmark':
      return (sender.tab) ? unbookmarkActionListener(sender.tab) : unbookmarkManga(message.manga_url);
    case 'update-chapter':
      return (sender.tab) ? updateCurrentChapter(sender.tab.url) : Promise.reject(TypeError('message has no property tab.url'));
    case 'import-single':
      return importManga(message.bookmark);
    default:
      return Promise.reject(new TypeError(`Unsupported message type: ${message.type}`));
  }
});
