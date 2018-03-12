import { getError as FoxyError } from '../util/foxyErrors';
import Alert from '../util/alerts';

const saveOptions = async () => {
  try {
    const checkedValue = document.querySelector('[name=storageType]:checked').id;

    await browser.runtime.sendMessage({
      type: 'switch-storage',
      to: checkedValue,
    });

    await browser.storage.sync.set({ storageType: checkedValue });

    Alert('success', {
      message: browser.i18n.getMessage('saveOptionsSuccessMessage'),
    }, 'alerts');
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    // Notify user that an error occurred
    const code = (err.code) ? err.message : FoxyError().message;
    const details = (err.code) ? JSON.stringify(err.params) : err.message;
    Alert('danger', {
      title: browser.i18n.getMessage('alertErrorTitle'),
      message: browser.i18n.getMessage('alertErrorMessage', [code, details]),
    }, 'alerts');
  }
};


// On window load
// ////////////////////////////////////////////////////////////////

(async () => {
  try {
    const { storageType } = await browser.storage.sync.get('storageType');

    // Select view mode
    const radio = document.getElementById(storageType || 'sync');
    if (radio) radio.checked = true;

    // Listens to the save button
    const saveBtn = document.getElementById('save-btn');
    saveBtn.onclick = saveOptions;
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
})();
