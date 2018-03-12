import { getError as FoxyError } from '../util/foxyErrors';
import Alert from '../util/alerts';
import * as MangaTable from './util/manga-table';
import * as Import from './util/import';
import Export from './util/export';

/**
 * Initializes the bookmark table.
 * @param {object~DOMElement} table Required. The table body to append the rows.
 */
async function initTable(table) {
  try {
    const bookmarkList = await browser.runtime.sendMessage({
      type: 'get-bookmark-data',
    });

    const promises = [];
    bookmarkList.forEach(async (bookmark) => {
      const mangaPromise = browser.runtime.sendMessage({
        type: 'get-manga-data',
        manga_key: `${bookmark.source}/${bookmark.reference}`,
      });
      promises.push(mangaPromise);

      table.appendChild(MangaTable.createRow(bookmark, await mangaPromise));
    });

    await Promise.all(promises);
  } catch (err) {
    throw err;
  }
}


// Script initialization
// ////////////////////////////////////////////////////////////////

(async () => {
  // Add listener to main checkbox
  const mainCheckbox = document.getElementById('main-checkbox');
  mainCheckbox.onclick = MangaTable.checkboxToggleListener;

  // Add listener to
  const bulkRemoveBtn = document.getElementById('bulk-remove-btn');
  bulkRemoveBtn.onclick = MangaTable.bulkRemoveBtnListener;

  // Add listener to export button
  const exportBtn = document.getElementById('export-btn');
  exportBtn.onclick = Export;

  Import.initModal();

  try {
    // Populate the table
    const table = document.getElementById('manga-table-body');
    await initTable(table);

    // Dispatch event to start the Datatables
    const event = new Event('table-loaded');
    table.dispatchEvent(event);
  } catch (err) {
    const code = (err.code) ? err.message : FoxyError().message;
    const details = (err.code) ? JSON.stringify(err.params) : err.message;
    Alert('danger', {
      title: browser.i18n.getMessage('alertErrorTitle'),
      message: browser.i18n.getMessage('alertErrorMessage', [code, details]),
    }, 'modal-alerts');
  }
})();
