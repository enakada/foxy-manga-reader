import { ErrorCode, getError as FoxyError } from '../../util/foxyErrors';
import Alert from '../../util/alerts';
import { processImportFile } from '../../util/upgrade';
import { createRow } from './manga-table';

/**
 * An array storing all checkbox.
 */
const mangaCheckboxList = [];

/**
 * The JSON import file parsed.
 */
let importFile;

/**
 * Updates the import progress bar.
 * @param {integer} newValue Required. The new percentage to set the progress bar.
 * @param {string} progressBar Optional. Which progress bar to set. Defaults to '#success-progress'.
 */
function updateProgress(newValue, progressBar = 'success-progress') {
  const progressBarElem = document.getElementById(progressBar);
  progressBarElem.style.width = `${newValue * 100}%`;
  progressBarElem.setAttribute('aria-valuenow', newValue * 100);
}

/**
 * Creates the table with all bookmarks in the import file.
 * @param {object~DOMElement} tbody The DOMElement representing the table body to parse.
 * @param {array} bookmarkList The current active bookmark list.
 * @returns A promise which resolves to null when complete.
 */
function createTable(tbody, bookmarkList) {
  importFile.bookmark_list.forEach((element) => {
    const exists = bookmarkList.find((bookmark) => {
      return bookmark.reference === element.reference && bookmark.source === element.source;
    });

    const row = document.createElement('tr');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'custom-control-input';
    checkbox.id = `${element.source}-${element.reference}`;
    checkbox.name = 'manga-import';
    checkbox.dataset.source = element.source;
    checkbox.dataset.reference = element.reference;
    if (!exists) checkbox.setAttribute('checked', true);
    mangaCheckboxList.push(checkbox);

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'custom-control-label';
    checkboxLabel.setAttribute('for', `${element.source}-${element.reference}`);

    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'custom-control custom-checkbox';
    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(checkboxLabel);

    const checkCell = document.createElement('td');
    checkCell.appendChild(checkboxDiv);
    row.appendChild(checkCell);

    const statusCell = document.createElement('td');
    if (exists) statusCell.innerHTML = '<span class="badge badge-warning">Already Exists</span>';
    else statusCell.innerHTML = '<span class="badge badge-danger">Missing</span>';
    row.appendChild(statusCell);

    const sourceCell = document.createElement('td');
    sourceCell.innerText = element.source;
    row.appendChild(sourceCell);

    const nameCell = document.createElement('td');
    nameCell.innerText = (!element.name) ? element.reference : element.name;
    row.appendChild(nameCell);

    tbody.appendChild(row);
  });

  return Promise.resolve();
}

/**
 * Parses the current import file into a table.
 * @param {*} file The file to parse.
 * @param {*} tbody The DOMElement representing the table body to parse.
 * @returns A promise which resolves true if the file could be parsed.
 */
export async function parseFile(file, tbody) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (load) => {
      try {
        importFile = JSON.parse(load.target.result);
        importFile = await processImportFile(importFile);
        if (!importFile || !importFile.bookmark_list) throw new TypeError('Import file has no property bookmark_list');

        const storage = await browser.storage.sync.get();

        const bookmarkList = Object.keys(storage)
          .filter(key => (storage[key].type && storage[key].type === 'bookmark'))
          .map(key => storage[key]);

        await createTable(tbody, bookmarkList);

        resolve(true);
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsText(file);
  });
}

/**
 * Sends the bookmark to the background script.
 * @param {object} data The bookmark source and reference to import
 * @returns A promise which resolves to true if the manga was imported.
 */
export async function importMangas(checkedRows) {
  try {
    const promises = [];

    // Progress tracker
    let imported = 0;
    let failed = 0;

    checkedRows.forEach((checkbox) => {
      const row = checkbox.parentElement.parentElement.parentElement;
      const status = row.children.item(1).children.item(0);

      const entry = importFile.bookmark_list.find((elem) => {
        return checkbox.dataset.reference === elem.reference && checkbox.dataset.source === elem.source;
      });

      promises.push(new Promise((resolve) => {
        browser.runtime.sendMessage({ type: 'import-single', bookmark: entry })
          .then((manga) => {
            checkbox.checked = false; // eslint-disable-line no-param-reassign
            status.className = 'badge badge-success';
            status.innerText = 'Imported';

            imported += 1;
            updateProgress(imported / checkedRows.length);

            resolve(createRow(manga));
          })
          .catch((err) => {
            status.className = 'badge badge-danger';
            status.innerText = 'Error';

            failed += 1;
            updateProgress(failed / checkedRows.length, 'failed-progress');

            const code = (err.code) ? err.message : FoxyError().message;
            const details = (err.code) ? JSON.stringify(err.params) : err.message;
            Alert('danger', {
              title: browser.i18n.getMessage('alertErrorTitle'),
              message: browser.i18n.getMessage('alertErrorMessage', [code, details]),
            }, 'modal-alerts');

            resolve();
          });
      }));
    });

    let mangaList = await Promise.all(promises);
    mangaList = mangaList.filter(manga => manga !== undefined);

    return Promise.resolve(mangaList);
  } catch (err) {
    return Promise.reject(err);
  }
}


// Listeners
// ////////////////////////////////////////////////////////////////

/**
 * Listens to changes to the FileBrowser and parses the selected file into a table.
 * @param {*} evt
 */
export async function importFileBrowserListener(evt) {
  const importBtn = document.getElementById('import-btn');
  const { files } = evt.target;

  // Send event to datatables script
  const tableContainer = document.getElementById('import-table-container');
  const ev = new Event('delete');
  tableContainer.dispatchEvent(ev);

  // Hide progress bar
  const progress = document.getElementById('import-progress-container');
  progress.style.display = 'none';

  const tbody = document.getElementById('import-table-body');
  tbody.innerHTML = '';

  mangaCheckboxList.length = 0;

  if (!files) {
    importBtn.disabled = true;
    return;
  }

  const file = files[0];

  try {
    await parseFile(file, tbody);

    // Dispatch event to start the Datatables
    const event = new Event('table-loaded');
    tableContainer.dispatchEvent(event);

    // Show the table
    tableContainer.style.display = 'inherit';

    importBtn.disabled = false;
  } catch (err) {
    Alert('danger', {
      title: browser.i18n.getMessage('alertErrorTitle'),
      message: browser.i18n.getMessage('alertErrorMessage', [FoxyError().message, err.message]),
    }, 'modal-alerts');
  }
}

/**
 * Listens to the import button. When clicked, runs through the whole table importing the selected manga.
 */
export async function importButtonListener() {
  try {
    const dataToImport = mangaCheckboxList.filter(checkbox => checkbox.checked);
    if (dataToImport.length === 0) throw FoxyError(ErrorCode.IMPORT_NO_DATA);

    // Check if size limit will not be exceeded
    const storage = await browser.storage.sync.get();
    const bookmarkList = Object.keys(storage)
      .filter(key => (storage[key].type && storage[key].type === 'bookmark'))
      .map(key => storage[key]);
    if (bookmarkList.length + dataToImport.length > 300) throw FoxyError(ErrorCode.MANGA_LIMIT_EXCEEDED, 'Limit: 300 entries');

    // Reset progress and show bar
    const progress = document.getElementById('import-progress-container');
    for (let i = 0; i < progress.childElementCount; i += 1) {
      progress.children.item(i).style.width = '0%';
      progress.children.item(i).setAttribute('aria-valuenow', 0);
    }
    progress.style.display = 'flex';

    const mangaList = await importMangas(dataToImport);

    // Send event to datatables script
    const tableContainer = document.getElementById('import-table-container');
    const ev = new CustomEvent('push-rows', {
      detail: { bookmarks_str: mangaList },
    });
    tableContainer.dispatchEvent(ev);
  } catch (err) {
    const code = (err.code) ? err.message : FoxyError().message;
    const details = (err.code) ? JSON.stringify(err.params) : err.message;
    Alert('danger', {
      title: browser.i18n.getMessage('alertErrorTitle'),
      message: browser.i18n.getMessage('alertErrorMessage', [code, details]),
    }, 'modal-alerts');
  }
}


// Initialization
// ////////////////////////////////////////////////////////////////

/**
 * Initializes the import module. Add listener to all required events.
 */
export function initModal() {
  // Add listener to main checkbox
  const importCheckbox = document.getElementById('modal-import-checkbox');
  importCheckbox.onclick = (event) => {
    for (let i = 0; i < mangaCheckboxList.length; i += 1) {
      mangaCheckboxList[i].checked = event.target.checked;
    }
  };

  // Add listener to import changes
  const fileUpload = document.getElementById('import-file');
  fileUpload.addEventListener('change', importFileBrowserListener);

  // Add listener to import button
  const importBtn = document.getElementById('import-btn');
  importBtn.onclick = importButtonListener;
}
