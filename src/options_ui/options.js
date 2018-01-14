import Export from './util/export';
import * as Import from './util/import';

// Page alerts
// ////////////////////////////////////////////////////////////////

function appendAlert(type, text) {
  const dismisssBtn = document.createElement('button');
  dismisssBtn.type = 'button';
  dismisssBtn.className = 'close';
  dismisssBtn.dataset.dismiss = 'alert';
  dismisssBtn.innerHTML = '<span aria-hidden="true">&times;</span>';

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.setAttribute('role', 'alert');

  alert.appendChild(dismisssBtn);
  alert.appendChild(document.createTextNode(text));

  const alertDiv = document.getElementById('alerts');

  alertDiv.appendChild(alert);
}

// Listeners
// ////////////////////////////////////////////////////////////////

/**
 * Listens to changes to the FileBrowser and parses the selected file into a table.
 * @param {*} evt
 */
async function importFileBrowserListener(evt) {
  const restoreBtn = document.getElementById('import-btn');
  const { files } = evt.target;

  const tbody = document.getElementById('import-table-body');
  tbody.innerHTML = '';

  if (!files) {
    restoreBtn.disabled = true;
    return;
  }

  const file = files[0];

  try {
    await Import.parseFile(file, tbody);

    // Show the table
    const table = document.getElementById('restore-table');
    table.style.display = 'inherit';

    restoreBtn.disabled = false;
  } catch (err) {
    appendAlert('danger', browser.i18n.getMessage('wrongRestoreFileAlert'));
  }
}

/**
 * Listens to the import button. When clicked, runs through the whole table importing the selected manga.
 */
async function importButtonListener() {
  const checkList = document.getElementsByName('manga-import');

  const overlay = document.getElementById('loading-overlay');
  overlay.style.display = 'inherit';

  for (let i = 0; i < checkList.length; i += 1) {
    const row = checkList[i].parentElement.parentElement.parentElement;
    const status = row.children.item(1).children.item(0);

    if (checkList[i].checked) {
      try {
        await Import.importManga(checkList[i].dataset); // eslint-disable-line no-await-in-loop

        checkList[i].checked = false;
        status.className = 'badge badge-success';
        status.innerText = 'Imported';
      } catch (err) {
        status.className = 'badge badge-danger';
        status.innerText = 'Error';

        console.error(`Could not restore backup file: ${err}`); // eslint-disable-line no-console
        appendAlert('danger', err);
      }
    }
  }

  overlay.style.display = 'none';
}

/**
 * Listens to the Export button. When clicked, generates an JSON file with all bookmarks.
 */
async function exportButtonListener() {
  try {
    await Export();
  } catch (err) {
    console.error(`Could not generate backup file: ${err}`); // eslint-disable-line no-console
    appendAlert('danger', browser.i18n.getMessage('backupFailureAlert'));
  }
}


// Script initialization
// ////////////////////////////////////////////////////////////////

(() => {
  // Add listener to export button
  const exportBtn = document.getElementById('export-btn');
  exportBtn.onclick = exportButtonListener;

  // Add listener to import changes
  const fileUpload = document.getElementById('import-file');
  fileUpload.addEventListener('change', importFileBrowserListener);

  // Add listener to import button
  const importBtn = document.getElementById('import-btn');
  importBtn.onclick = importButtonListener;

  // Add listener to main checkbox
  const importCheckbox = document.getElementById('main-import-checkbox');
  importCheckbox.onclick = (event) => {
    Import.toggleCheckbox(event.target.checked);
  };
})();
