import SourceMigrations from './source-migration';
import store from '../util/datastore';

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
 */
async function updateStorage(bookmark, changes) {
  try {
    const manga = await store.getItem(`${bookmark.source}/${bookmark.reference}`);

    const newMangaObj = applyChanges(manga, changes);

    await store.setItem(`${newMangaObj.source}/${newMangaObj.reference}`, newMangaObj);
  } catch (err) {
    throw err;
  }
}

/**
 * Applies all necessary DB migrations.
 * @param {string} previousVersion Required. The previous version string to migrate from.
 * @param {object~array} bookmarkList Required. An array with the bookmark list to update.
 * @param {boolean} updateIndexedDb A boolean indicating whether or not to update the indexedDB. Defaults to true.
 * @returns {object~array} The updated bookmark list.
 */
async function migrateDB(previousVersion, bookmarkList, updateIndexedDb = true) {
  try {
    const migrations = SourceMigrations.filter((elem) => {
      console.log(`Migrating database from '< v${previousVersion}' to 'v${elem.version}': ${compareVersions(previousVersion, elem.version)}`);
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
      newList.push(applyChanges(bookmark, changes));

      // Update indexedDB storage
      if (updateIndexedDb) {
        promises.push(updateStorage(bookmark, changes));
      }
    }

    await Promise.all(promises);
    return newList;
  } catch (err) {
    throw err;
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

    // Applies all DB migrations needed
    const newBookmarkList = await migrateDB(previousVersion, storage.bookmark_list);
    storage.bookmark_list = newBookmarkList;

    await browser.storage.sync.set({ bookmark_list: storage.bookmark_list });
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
    // Before version 0.6.0 the export file version was set to 1.0
    const version = (importObj.version === '1.0') ? '0.5.1' : importObj.version;

    const newBookmarkList = await migrateDB(version, importObj.bookmark_list, false);

    const returnValue = Object.assign({}, importObj);
    returnValue.bookmark_list = newBookmarkList;

    return Promise.resolve(returnValue);
  } catch (err) {
    return Promise.reject(err);
  }
}
