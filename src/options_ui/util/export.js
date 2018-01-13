/**
 * Exports a backup file with all bookmarks.
 */
export default async function exportBookmarks() {
  // Create a hidden <a> tag
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';

  try {
    const storage = await browser.storage.sync.get('bookmark_list');

    const backup = {
      version: '1.0',
    };
    backup.bookmark_list = storage.bookmark_list;

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
