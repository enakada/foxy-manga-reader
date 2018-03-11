import SourceMigrations from './source-migration';
import * as FoxyStorage from '../util/FoxyStorage';

/**
 * Checks whether or not v1 is lower than v2.
 * @param {string} v1 Required. The first version string to compare.
 * @param {string} v2 Required. The second version string to compare.
 * @returns {boolean} True if v1 is lower than v2.
 */
export function compareVersions(v1, v2) {
  if (v1 === v2) return false;

  const [v1Major, v1Minor, v1Patch] = v1.split('.');
  const [v2Major, v2Minor, v2Patch] = v2.split('.');

  if (parseInt(v1Major, 10) > parseInt(v2Major, 10)) return false;
  if (parseInt(v1Minor, 10) > parseInt(v2Minor, 10)) return false;

  if (parseInt(v1Minor, 10) === parseInt(v2Minor, 10)) {
    return (parseInt(v1Patch.replace(/(\d+)(?:b\d*)*/, '$1'), 10) < parseInt(v2Patch, 10));
  }

  return true;
}

/**
 * Returns the provided object with all changes applied.
 * @param {object} object Required. The object to apply the change to.
 * @param {object~array} changes Required. The array with all changes to apply to the object.
 * @returns {object} The new object after all changes were applied.
 */
export function applyChanges(object, changes) {
  const newObj = Object.assign({}, object);

  for (let i = 0; i < changes.length; i += 1) {
    const change = changes[i];

    switch (change.type) {
      case 'replace':
        if (change.oldValue) {
          newObj[change.key] = object[change.key].replace(change.oldValue, change.newValue);
        } else {
          newObj[change.key] = change.newValue;
        }
        break;

      default:
        break;
    }
  }

  return newObj;
}

/**
 * Updates the IndexedDB entry, applying the provided changes.
 * @param {object} bookmark Required. The bookmark to update.
 * @param {object~array} changes Required. The changes to apply to the storage data.
 * @returns {object~promise} A promise which resolves to true if the changes were applied.
 */
async function updateStorage(bookmark, changes) {
  try {
    const manga = await FoxyStorage.DataStorage.getItem(`${bookmark.source}/${bookmark.reference}`);
    if (!manga) Promise.resolve(false);

    const newMangaObj = applyChanges(manga, changes);

    await FoxyStorage.DataStorage.removeItem(`${bookmark.source}/${bookmark.reference}`);
    await FoxyStorage.DataStorage.setItem(`${newMangaObj.source}/${newMangaObj.reference}`, newMangaObj);

    return Promise.resolve(true);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Applies all necessary DB migrations.
 * @param {string} previousVersion Required. The previous version string to migrate from.
 * @param {object~array} bookmarkList Required. An array with the bookmark list to update.
 * @param {boolean} updateDb A boolean indicating whether or not to update the indexedDB and Sync. Defaults to true.
 * @returns {object~array} The updated bookmark list.
 */
async function migrateDB(previousVersion, bookmarkList, updateDb = true) {
  try {
    const migrations = SourceMigrations.filter((elem) => {
      return compareVersions(previousVersion, elem.version);
    });

    if (migrations.length === 0) return bookmarkList; // Nothing to do

    let changes = [];
    for (let i = 0; i < migrations.length; i += 1) {
      changes = changes.concat(migrations[i].changes);
    }

    const promises = [];
    const newList = [];
    for (let i = 0; i < bookmarkList.length; i += 1) {
      const bookmark = bookmarkList[i];
      const key = `${bookmark.source}/${bookmark.reference}`;

      const updatedEntry = applyChanges(bookmark, changes);

      newList.push(updatedEntry);

      // Update indexedDB storage
      if (updateDb) {
        promises.push(FoxyStorage.setMetadata(key, updatedEntry));
        promises.push(updateStorage(bookmark, changes));
      }
    }

    await Promise.all(promises);

    return Promise.resolve(newList);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Redesigns the bookmark list. Converts a single list with all bookmarks into multiple entries
 * indexed by the key: source/reference.
 * @param {object~array} bookmarkList The old bookmark list to redesign.
 * @return {object~Promise} A promise which resolves if the redesign was successfull.
 */
async function redesignBookmarkStorage(bookmarkList) {
  try {
    const promises = [];

    bookmarkList.forEach((bookmark) => {
      const key = `${bookmark.source}/${bookmark.reference}`;

      const newBookmark = Object.assign({}, bookmark, { type: 'bookmark' });

      promises.push(FoxyStorage.setMetadata(key, newBookmark));
    });

    await Promise.all(promises);
    await browser.storage.sync.remove('bookmark_list');

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Updates the addon to the new version.
 * @param {string} previousVersion Required. String in the format MAJOR.MINOR.PATCH representing the addon previous version.
 * @returns {object~promise} A promise that resolves to null if the storage was updated.
 */
export async function updateAddon(previousVersion) {
  try {
    const storage = await browser.storage.sync.get();

    // Handle transition to v0.3.1 - inclusion of manga list view mode
    if (compareVersions(previousVersion, '0.3.1') && typeof storage.view_mode === 'string') {
      await browser.storage.sync.set({
        view_mode: { manga: storage.view_mode },
      });
    }

    // Handle transition to v0.6.0 - storage redesign (issue#9)
    if (compareVersions(previousVersion, '0.6.0') && storage.bookmark_list) {
      await redesignBookmarkStorage(storage.bookmark_list);
    }

    const bookmarkList = await FoxyStorage.getMetadata();

    // Handle transition to v0.6.2 - local/sync storage options (issue#13)
    if (compareVersions(previousVersion, '0.6.2') && bookmarkList.length > FoxyStorage.syncLimit) {
      await FoxyStorage.switchStorage('local');
      await browser.storage.sync.set({ storageType: 'local' });
    }

    // Applies all DB migrations needed
    await migrateDB(previousVersion, bookmarkList);

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Parses the import file applying any migrations needed.
 * @param {object} importObj Required. The JSON object of the import file.
 * @returns {object~promise} A promise that resolves to the new import file object representation.
 */
export async function processImportFile(importObj) {
  try {
    // Before version 0.5.2 the export file version was set to 1.0
    const version = (importObj.version === '1.0') ? '0.5.1' : importObj.version;

    // Handle transition to v0.6.0 - storage redesign (issue#9)
    const bookmarkList = importObj.bookmark_list;
    for (let i = 0; i < bookmarkList.length; i += 1) {
      if (!bookmarkList[i].type) bookmarkList[i].type = 'bookmark';
    }

    const newBookmarkList = await migrateDB(version, bookmarkList, false);

    const returnValue = Object.assign({}, importObj);
    returnValue.bookmark_list = newBookmarkList;

    return Promise.resolve(returnValue);
  } catch (err) {
    return Promise.reject(err);
  }
}
