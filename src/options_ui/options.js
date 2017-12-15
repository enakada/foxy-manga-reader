// Page alerts
// ////////////////////////////////////////////////////////////////

function appendAlert(type, text) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.setAttribute('role', 'alert');
  alert.appendChild(document.createTextNode(text));

  const alertDiv = document.getElementById('alerts');

  alertDiv.appendChild(alert);
}

// Backup
// ////////////////////////////////////////////////////////////////

async function backupBookmarks() {
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

document.addEventListener('click', async (e) => {
  if (e.target.id !== 'backup-btn') return;

  try {
    await backupBookmarks();
  } catch (err) {
    console.error(`Could not generate backup file: ${err}`); // eslint-disable-line no-console
    appendAlert('danger', browser.i18n.getMessage('backupFailureAlert'));
  }
});


// Restore
// ////////////////////////////////////////////////////////////////

let restoreFile;

const fileUpload = document.getElementById('restore-file');

fileUpload.addEventListener('change', (evt) => {
  const restoreBtn = document.getElementById('restore-btn');

  const { files } = evt.target;

  if (!files) {
    restoreBtn.disabled = true;
    return;
  }

  const file = files[0];

  const reader = new FileReader();
  reader.onload = (load) => {
    try {
      restoreFile = JSON.parse(load.target.result);
    } catch (err) {
      appendAlert('danger', browser.i18n.getMessage('wrongRestoreFileAlert'));
    }
  };

  reader.readAsText(file);

  restoreBtn.disabled = false;
});

document.addEventListener('click', async (e) => {
  if (e.target.id !== 'restore-btn') return;

  if (!restoreFile || !restoreFile.bookmark_list) return;

  try {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'inherit';

    const result = await browser.runtime.sendMessage({
      type: 'restore',
      bookmark_list: restoreFile.bookmark_list,
    });

    overlay.style.display = 'none';

    if (result) appendAlert('success', browser.i18n.getMessage('restoreSuccessAlert'));
  } catch (err) {
    console.error(`Could not restore backup file: ${err}`); // eslint-disable-line no-console
    appendAlert('danger', browser.i18n.getMessage('restoreFailureAlert'));
  } finally {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
  }
});
