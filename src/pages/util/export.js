import { getError as FoxyError } from '../../util/foxyErrors';
import Alert from '../../util/alerts';

/**
 * Exports a backup file with all bookmarks.
 */
async function exportBookmarks() {
  // Create a hidden <a> tag
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';

  try {
    const bookmarkList = await browser.runtime.sendMessage({
      type: 'get-bookmark-data',
    });

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

/**
 * Listens to the export button and generates the export file when clicked.
 */
export default async function exportButtonListener() {
  try {
    await exportBookmarks();
  } catch (err) {
    Alert('danger', {
      title: browser.i18n.getMessage('alertErrorTitle'),
      message: browser.i18n.getMessage('alertErrorMessage', [FoxyError().message, err.message]),
    });
  }
}
