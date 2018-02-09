/**
 * Exports a backup file with all bookmarks.
 */
export default async function exportBookmarks() {
  // Create a hidden <a> tag
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';

  try {
    const storage = await browser.storage.sync.get();

    const bookmarkList = Object.keys(storage)
      .filter(key => (storage[key].type && storage[key].type === 'bookmark'))
      .map(key => storage[key]);

    const backup = {
      version: browser.runtime.getManifest().version,
      bookmark_list: bookmarkList,
    };

    // Create timestamp
    const date = new Date();
    const timestamp = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;

    // Create the file
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = `foxy-manga-reader-${timestamp}.bkp`;

    // Click the <a> tag
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    throw err;
  }
}
