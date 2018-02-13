import moment from 'moment';
import { getError as FoxyError } from '../../util/foxyErrors';
import Alert from '../../util/alerts';

let mangaCheckboxList = [];

let selectedCheckbox = 0;

// Table actions
// ////////////////////////////////////////////////////////////////

/**
 * Updates the selected count DOMElement and disables/enables the bulk actions dropdown.
 * @param {boolean} add Required. Whether or not to step up the selected count.
 * @param {integer} increment Optional. The number of steps to move. Defaults to 1.
 */
function updateSelectedCount(add, increment = 1) {
  selectedCheckbox = (add) ? selectedCheckbox + increment : selectedCheckbox - increment;

  const div = document.getElementById('selected-count');
  div.innerText = `${selectedCheckbox} selected entries`;

  const bulkAction = document.getElementById('bulk-dropdown');
  bulkAction.disabled = (selectedCheckbox === 0);
}

/**
 * Bulk removes all selected manga from the bookmark list.
 */
async function bulkRemove() {
  try {
    const promises = [];
    const indices = [];

    mangaCheckboxList.forEach((checkbox, index) => {
      if (!checkbox.checked) return;

      const row = checkbox.parentElement.parentElement.parentElement;
      const message = {
        type: 'unbookmark',
        manga_url: row.dataset.mangaUrl,
        manga_key: row.dataset.mangaKey,
      };

      promises.push(new Promise((resolve) => {
        browser.runtime.sendMessage(message)
          .then(() => {
            indices.push(index);
            resolve(row);
          })
          .catch((err) => {
            const code = (err.code) ? err.message : FoxyError().message;
            const details = (err.code) ? JSON.stringify(err.params) : err.message;
            Alert('danger', {
              title: browser.i18n.getMessage('alertErrorTitle'),
              message: browser.i18n.getMessage('alertErrorMessage', [code, details]),
            });
            resolve();
          });
      }));
    });

    let rows = await Promise.all(promises);
    rows = rows.filter(row => row !== undefined);

    // Recreate the checkbox array
    mangaCheckboxList = mangaCheckboxList.filter((checkbox, index) => !indices.includes(index));

    // Send event to datatables script
    const tableContainer = document.getElementById('manga-table-body');
    const ev = new CustomEvent('delete-rows', {
      detail: { rows },
    });
    tableContainer.dispatchEvent(ev);

    updateSelectedCount(false, rows.length);

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

// Table creation
// ////////////////////////////////////////////////////////////////

/**
 * Creates a new table row with the bookmark information.
 * @param {object} bookmark Required. The bookmark object.
 * @returns {object~DOMElement} The <tr> element to append to the table.
 */
export function createRow(bookmark) {
  // Table Row
  const row = document.createElement('tr');
  row.dataset.mangaUrl = bookmark.url;
  row.dataset.mangaKey = `${bookmark.source}/${bookmark.reference}`;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'custom-control-input';
  checkbox.id = `${bookmark.source}-${bookmark.reference}`;
  checkbox.name = 'manga-import';
  checkbox.onchange = (e) => { updateSelectedCount(e.target.checked); };
  mangaCheckboxList.push(checkbox);

  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'custom-control-label';
  checkboxLabel.setAttribute('for', `${bookmark.source}-${bookmark.reference}`);

  const checkboxDiv = document.createElement('div');
  checkboxDiv.className = 'custom-control custom-checkbox';
  checkboxDiv.appendChild(checkbox);
  checkboxDiv.appendChild(checkboxLabel);

  const checkCell = document.createElement('td');
  checkCell.appendChild(checkboxDiv);
  row.appendChild(checkCell);

  // Name
  const nameCell = document.createElement('td');
  const a = document.createElement('a');
  a.href = bookmark.url;
  a.innerText = (!bookmark.name) ? bookmark.reference : bookmark.name;
  nameCell.appendChild(a);
  row.appendChild(nameCell);

  // Source
  const sourceCell = document.createElement('td');
  sourceCell.innerText = bookmark.source;
  row.appendChild(sourceCell);

  // Last Read
  const lastReadCell = document.createElement('td');
  lastReadCell.innerText = moment(bookmark.last_read.date).format('LL');
  row.appendChild(lastReadCell);

  return row;
}


// Table listeners
// ////////////////////////////////////////////////////////////////

/**
 * Listens to changes to the main table checkbox and either mark all rows or clear the marks from them.
 * @param {*} event Required. The event that was triggered.
 */
export function checkboxToggleListener(event) {
  for (let i = 0; i < mangaCheckboxList.length; i += 1) {
    mangaCheckboxList[i].checked = event.target.checked;
  }

  selectedCheckbox = (event.target.checked) ? mangaCheckboxList.length : 0;

  const div = document.getElementById('selected-count');
  div.innerText = `${selectedCheckbox} selected entries`;

  const bulkAction = document.getElementById('bulk-dropdown');
  bulkAction.disabled = (selectedCheckbox === 0);
}

export async function bulkRemoveBtnListener() {
  try {
    const bulkAction = document.getElementById('bulk-dropdown');
    bulkAction.disabled = true;

    await bulkRemove();

    bulkAction.disabled = false;

    Alert('success', {
      message: browser.i18n.getMessage('unbookmarkMangaNotificationMessage'),
    });
  } catch (err) {
    const code = (err.code) ? err.message : FoxyError().message;
    const details = (err.code) ? JSON.stringify(err.params) : err.message;
    Alert('danger', {
      title: browser.i18n.getMessage('alertErrorTitle'),
      message: browser.i18n.getMessage('alertErrorMessage', [code, details]),
    });
  }
}
