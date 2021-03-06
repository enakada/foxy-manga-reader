/*
 * This comment explains how the storage works for Foxy.
 *
 * Foxy saves three different kinds of data to the storage api:
 * - Manga metadata: Basic manga/source information and progress.
 * - Manga data: Complete manga information (cover, chapters, status...)
 * - Add-on configurations: Display and theme options.
 *
 * ALL add-on configurations need to be stored in the sync storage area.
 *
 * Manga data (the second type of data) is saved to the indexedDB storage
 * using the 'localforage' package.
 *
 * Users are able to choose where to store the first kind of data (Manga Metadata).
 * There are 3 different options:
 * - Local Storage Area ('local'): local access only, but unlimited storage;
 * - Sync Storage Area ('sync'): synced by Firefox. Limited to 280 manga;
 * - Dropbox (coming soon)
 */

import localforage from 'localforage';
import { ErrorCode, getError as FoxyError } from '../util/foxyErrors';

export const syncLimit = 280;


// Manga data storage
// ////////////////////////////////////////////////////////////////

export const DataStorage = localforage.createInstance({
  name: 'foxy-manga-reader',
});


// Manga metadata storage operations
// ////////////////////////////////////////////////////////////////

/**
 * Checks whether or not the sync manga limit was exceeded.
 * @param {object} options Required. Method options.
 * @param {object} options.preloadedStorage Optional. The sync storage in case it was previously loaded.
 * @param {integer} options.sum Optional. If present, checks whether the sum of the current count
 *  and this value exceeds the limit.
 * @returns A Promise which resolves to null if the limit was not exceeded.
 */
export async function checkLimit({ preloadedStorage, sum }) {
  try {
    const storage = preloadedStorage || await browser.storage.sync.get();
    const { storageType } = storage;

    // No limit for locations outside sync
    if (storageType && storageType !== 'sync') return;

    const mangaCount = Object.keys(storage)
      .filter(key => (storage[key].type && storage[key].type === 'bookmark'))
      .length;

    const exceeds = (sum)
      ? mangaCount + sum > syncLimit
      : mangaCount >= syncLimit;

    if (exceeds) throw FoxyError(ErrorCode.MANGA_LIMIT_EXCEEDED, `Limit: ${syncLimit} entries`);

    return;
  } catch (err) {
    throw err;
  }
}

/**
 * Retrieves one or more manga metadata items from the specified storage area.
 * @param {string|object|array} keys What to retrieve. If an empty string, object or array is passed,
 *  an empty object will be retrieved. If null is passed, or an undefined value, the entire storage
 *  is retrieved.
 * @returns A Promise that will be fulfilled with the result of `browser.storage.<storageType>.get()`
 */
export async function getMetadata(keys) {
  try {
    const { storageType } = await browser.storage.sync.get('storageType');

    const returnArray = (!keys || Array.isArray(keys));

    let storage;
    switch (storageType) {
      case 'local':
        storage = await browser.storage.local.get(keys);
        break;

      case 'sync':
      default:
        storage = await browser.storage.sync.get(keys);
        break;
    }

    // Return an object if keys is a string or else, an array
    if (!returnArray) {
      return (!Object.hasOwnProperty.call(storage, keys))
        ? Promise.resolve()
        : Promise.resolve(storage[keys]);
    }

    const list = Object.keys(storage)
      .filter(key => (storage[key].type && storage[key].type === 'bookmark'))
      .map(key => storage[key]);

    return Promise.resolve(list);
  } catch (err) {
    throw err;
  }
}

/**
 * Stores one manga metadata in the selected storage area or update existing items.
 * @param {string} key Required. The key of the manga to be saved.
 *  If an item already exists, its value will be updated.
 * @param {object} value Required. The value to stored in the storage.
 *  If an item already exists, its value will be updated.
 * @returns A Promise that will be fulfilled with no arguments if the operation
 *  succeeded. If the operation failed, the promise will be rejected with an error message.
 */
export async function setMetadata(key, value) {
  const storage = {};
  storage[key] = value;

  try {
    const syncStorage = await browser.storage.sync.get();
    const { storageType } = syncStorage;

    let result;
    switch (storageType) {
      case 'local':
        result = await browser.storage.local.set(storage);
        break;
      case 'sync':
      default:
        // Check manga limit in case we are not updating data
        if (!syncStorage[key]) {
          await checkLimit({ preloadedStorage: syncStorage });
        }

        result = await browser.storage.sync.set(storage);
        break;
    }

    return Promise.resolve(result);
  } catch (err) {
    throw err;
  }
}

/**
 * Removes one or more manga metadata items from the selected storage area.
 * @param {string|array} keys A string, or array of strings, representing the
 *  key(s) of the item(s) to be removed.
 * @returns A Promise that will be fulfilled with no arguments if the operation
 *  succeeded. If the operation failed, the promise will be rejected with an error message.
 */
export async function removeMetadata(keys) {
  try {
    const { storageType } = await browser.storage.sync.get('storageType');

    let result;
    switch (storageType) {
      case 'local':
        result = await browser.storage.local.remove(keys);
        break;
      case 'sync':
      default:
        result = await browser.storage.sync.remove(keys);
        break;
    }

    return Promise.resolve(result);
  } catch (err) {
    throw err;
  }
}

/**
 * Migrates the current manga metadata list to the specified storage type.
 * @param {string} to Required. A string definind which storage type to move the metadata list.
 *  Can be one of the following ['local, 'sync'].
 * @returns A Promise which resolves to true if the storage was migrated or false
 *  if the destination is the same as the current storage.
 */
export async function switchStorage(to) {
  try {
    let { storageType } = await browser.storage.sync.get('storageType');
    storageType = storageType || 'sync';
    if (storageType === to) return Promise.resolve(false);

    const oldStorage = await browser.storage[storageType].get();

    const keys = Object.keys(oldStorage)
      .filter(key => (oldStorage[key].type && oldStorage[key].type === 'bookmark'));

    // Check if the list will exceed the limit in case the user is migrating to sync
    if (to === 'sync' && keys.length > syncLimit) {
      throw FoxyError(ErrorCode.MANGA_LIMIT_EXCEEDED, `Limit: ${syncLimit} entries`);
    }

    const newStorage = {};
    keys.forEach((key) => {
      newStorage[key] = oldStorage[key];
    });

    await browser.storage[to].set(newStorage);
    await browser.storage[storageType].remove(Object.keys(newStorage));

    return Promise.resolve(true);
  } catch (err) {
    throw err;
  }
}
