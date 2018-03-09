import { ErrorCode, getError as FoxyError } from '../util/foxyErrors';
import * as Extractor from './extractors/extractor';
import * as Notification from '../util/notification';
import * as FoxyStorage from '../util/FoxyStorage';
import store from '../util/datastore';
import { updateAddon } from '../util/upgrade';

// Core Methods
// ////////////////////////////////////////////////////////////////

/**
 * Bookmarks a new manga.
 * - Get extractor from URL
 * - Get Manga Info
 * - Get current chapter info, if any, or save first chapter
 * - save manga reference (and cur_chapter) to FoxyStorage
 * - Save manga info to indexedDB
 * @param {string} url The url of the manga.
 * @param {object} bookmark The bookmark object of a previous backup.
 * @param {object} options Optional. Contains property `skipSave`: defines whether or not the method should save
 *  bookmarks to the `FoxyStorage`.
 * @returns {Promise} A promise which resolves to the manga object.
 */
async function bookmarkManga(url, bookmark, options = {}) {
  try {
    // Prevent manga list from exceeding a limit when using sync storage
    await FoxyStorage.checkLimit({});

    const info = Extractor.parseUrl(url);
    if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, url);

    const manga = await info.extractor.getMangaInfo(url);
    if (!manga) throw FoxyError(ErrorCode.WRONG_MANGA_URL, url);

    // Save manga information
    await store.setItem(info.key, manga);

    // Get the bookmarkEntry
    let bookmarkEntry;
    if (bookmark) {
      bookmarkEntry = bookmark;
    } else {
      const currentChapter = info.extractor.getChapterReference(url, manga.chapter_list[0]);
      if (!currentChapter.index) {
        const index = manga.chapter_list.findIndex(elem => elem.id === currentChapter.id);
        currentChapter.index = index;
      }

      bookmarkEntry = {
        type: 'bookmark', // Required. Included on version 0.6.0
        source: manga.source,
        reference: manga.reference,
        url: manga.url,
        last_read: {
          date: new Date(),
          chapter: {
            id: currentChapter.id,
            index: currentChapter.index,
          },
        },
      };
    }

    // Save bookmark to FoxyStorage
    if (!options.skipSave) await FoxyStorage.setMetadata(info.key, bookmarkEntry);

    return Promise.resolve(manga);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Unbookmarks a manga.
 * - Get extractor from URL
 * - Remove manga data from FoxyStorage
 * - Remove manga data from indexeddb
 * @param {string} url Required. The url of the manga.
 * @param {string} key Optional. The key of the manga to unbookmark.
 * @returns {Promise} A promise which resolves to true if manga was unbookmarked.
 */
async function unbookmarkManga(url, key) {
  try {
    let mangaKey;
    if (key) {
      mangaKey = key;
    } else {
      const info = Extractor.parseUrl(url);
      if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, url);

      mangaKey = info.key;
    }

    // Remove from indexdb and sync
    await FoxyStorage.removeMetadata(mangaKey);
    await store.removeItem(mangaKey);

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Updates the last read chapter to the URL defined chapter.
 * - Get extractor from URL
 * - Get last_read information from FoxyStorage
 * - Check if current chapter is higher than the storage
 * - Update the storage
 * @param {string} url The url of the manga.
 * @returns {Promise} A promise which resolves to true if a manga was updated.
 */
async function updateCurrentChapter(url) {
  try {
    const info = Extractor.parseUrl(url);
    if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, url);

    const entry = await FoxyStorage.getMetadata(info.key);
    if (!entry) return Promise.resolve(false);

    const manga = await store.getItem(info.key);
    if (!manga) throw FoxyError(ErrorCode.STORE_ERROR, info.key);

    const chapter = info.extractor.getChapterReference(url);
    if (!chapter) throw FoxyError(ErrorCode.NO_CHAPTER_REF, url);

    const chapterIndex = manga.chapter_list.findIndex(elem => elem.id === chapter.id);

    // If manga order < current chapter
    const lastChapterRead = entry.last_read.chapter;
    if (chapterIndex > lastChapterRead.index) {
      entry.last_read.chapter.id = chapter.id;
      entry.last_read.chapter.index = chapterIndex;

      await FoxyStorage.setMetadata(info.key, entry);

      // Send message to update current chapter
      browser.runtime.sendMessage({
        type: 'update-current-chapter',
        bookmark: entry,
      });
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  } catch (err) {
    return Promise.reject(err);
  }
}


// On Installation and Sync
// ////////////////////////////////////////////////////////////////

/**
 * Initializes and/or upgrades the storage data when extension is installed.
 * @param {object} details An object with the following properties: previousVersion, reason and temporary.
 */
async function init(details) {
  if (details.reason !== 'update') return;

  try {
    await updateAddon(details.previousVersion);
  } catch (err) {
    console.error(`An error occurred while initializing extension: ${err}`); // eslint-disable-line no-console
  }
}

browser.runtime.onInstalled.addListener(init);

/**
 * Handles the sync of new manga bookmarks.
 * @param {object} changes Object describing the change. This contains one property for each key that changed.
 *  The name of the property is the name of the key that changed, and its value is a storage.StorageChange object describing the change to that item.
 * @param {string} areaName The name of the storage area ("sync", "local" or "managed") to which the changes were made.
 */
async function syncHandler(changes, areaName) {
  // Handle only changes to bookmark_list in the sync storage.
  if (areaName !== 'sync') return;

  const bookmarkList = Object.keys(changes)
    .filter(key => (changes[key].newValue && changes[key].newValue.type === 'bookmark'))
    .map(key => changes[key].newValue);
  if (!bookmarkList) return;

  try {
    const keys = await store.keys();

    // Add manga information for each new entry in the bookmarklist
    bookmarkList.forEach(async (bookmark) => {
      const storeKey = `${bookmark.source}/${bookmark.reference}`;

      if (keys.indexOf(storeKey) === -1) {
        await bookmarkManga(bookmark.url, bookmark, { skipSave: true });
      }
    });
  } catch (err) {
    console.error(`An error occurred while syncing extension data: ${err}`); // eslint-disable-line no-console

    Notification.error({
      title: FoxyError(ErrorCode.BOOKMARK_SYNC_ERROR).message,
      message: browser.i18n.getMessage('errorMessage', err.message),
    });
  }
}

browser.storage.onChanged.addListener(syncHandler);


// Alarms
// ////////////////////////////////////////////////////////////////

/**
 * Runs on the background and updates all bookmarked manga chapters.
 * @param {alarms.Alarm} alarm The alarm that fired.
 */
async function updateMangaChapterList(alarm) {
  if (alarm.name !== 'background_update') return;

  try {
    const storage = await browser.storage.sync.get('badge_count');
    if (!storage.badge_count) storage.badge_count = 0;

    const keys = await store.keys();
    if (!keys) return; // no manga to track

    keys.forEach(async (key) => {
      const manga = await store.getItem(key);

      const bookmark = await FoxyStorage.getMetadata(key);
      if (!bookmark) throw FoxyError(ErrorCode.NO_BOOKMARK_ERROR, manga.name);

      console.log(`Checking updates for '${manga.name}'`);

      const info = Extractor.parseUrl(manga.url);
      if (!info) throw FoxyError(ErrorCode.UNPARSE_URL, manga.url);

      const { count, chapterList } = await info.extractor.updateChapters(manga);

      const lastReadCh = bookmark.last_read.chapter;
      const lastReadIndex = chapterList.findIndex(elem => elem.id === lastReadCh.id);
      if (lastReadIndex < 0) {
        bookmark.last_read.chapter.id = chapterList[lastReadCh.index].id;
      } else if (lastReadIndex !== lastReadCh.index) {
        bookmark.last_read.chapter.index = lastReadIndex;
      }

      // Save metadata
      await FoxyStorage.setMetadata(key, bookmark);

      // Update manga metadata
      const metadata = await info.extractor.updateMetadata(manga);

      // Update db
      const mangaCopy = Object.assign(manga, { chapter_list: chapterList }, metadata);
      await store.setItem(info.key, mangaCopy);

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
        bookmark,
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

  try {
    const bookmark = await FoxyStorage.getMetadata(info.key);

    if (!bookmark) { // not bookmarked
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
  const key = `${bookmark.source}/${bookmark.reference}`;

  try {
    const manga = await store.getItem(key);
    if (!manga) {
      await bookmarkManga(bookmark.url, bookmark);
    } else {
      await FoxyStorage.setMetadata(key, bookmark);
    }

    return Promise.resolve(bookmark);
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
      return (sender.tab && !sender.tab.url.includes('moz-extension')) ? unbookmarkActionListener(sender.tab) : unbookmarkManga(message.manga_url, message.manga_key);
    case 'update-chapter':
      return (sender.tab) ? updateCurrentChapter(sender.tab.url) : Promise.reject(TypeError('message has no property tab.url'));
    case 'get-manga-data':
      return store.getItem(message.manga_key);
    case 'import-single':
      return importManga(message.bookmark);
    default:
      return Promise.reject(new TypeError(`Unsupported message type: ${message.type}`));
  }
});
