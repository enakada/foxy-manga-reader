let importFile;

/**
 * Creates the table with all bookmarks in the import file.
 * @param {object~DOMElement} tbody The DOMElement representing the table body to parse.
 * @param {array} bookmarkList The current active bookmark list.
 * @returns A promise which resolves to null when complete.
 */
function createTable(tbody, bookmarkList) {
  if (!importFile || !importFile.bookmark_list) return Promise.reject(Error('Import file has not bookmark_list'));

  importFile.bookmark_list.forEach((element) => {
    const exists = bookmarkList.find((bookmark) => {
      return bookmark.reference === element.reference && bookmark.source === element.source;
    });

    const row = document.createElement('tr');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'custom-control-input';
    checkbox.name = 'manga-import';
    checkbox.dataset.source = element.source;
    checkbox.dataset.reference = element.reference;
    if (!exists) checkbox.setAttribute('checked', 'true');

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'custom-control custom-checkbox';
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.innerHTML += '<span class="custom-control-indicator"></span>';

    const checkCell = document.createElement('td');
    checkCell.appendChild(checkboxLabel);
    row.appendChild(checkCell);

    const statusCell = document.createElement('td');
    if (exists) statusCell.innerHTML = '<span class="badge badge-warning">Already Exists</span>';
    else statusCell.innerHTML = '<span class="badge badge-danger">Missing</span>';
    row.appendChild(statusCell);

    const sourceCell = document.createElement('td');
    sourceCell.innerText = element.source;
    row.appendChild(sourceCell);

    const nameCell = document.createElement('td');
    nameCell.innerText = (importFile.version === '1.0') ? element.reference : element.name;
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

        const storage = await browser.storage.sync.get('bookmark_list');

        await createTable(tbody, storage.bookmark_list);

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
export async function importManga(data) {
  const entry = importFile.bookmark_list.find((elem) => {
    return data.reference === elem.reference && data.source === elem.source;
  });

  return browser.runtime.sendMessage({
    type: 'import-single',
    bookmark: entry,
  });
}

/**
 * Toggles all the checkboxes form the import table.
 * @param {boolean} isChecked A boolean indicating whether or not the checkbox should be checked.
 */
export function toggleCheckbox(isChecked) {
  const checkList = document.getElementsByName('manga-import');
  for (let i = 0; i < checkList.length; i += 1) {
    checkList[i].checked = isChecked;
  }
}
