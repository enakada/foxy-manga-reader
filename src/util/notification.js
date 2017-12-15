/**
 * Displays an informative notification.
 *  {title, message} options are required.
 * @param {notifications.NotificationOptions} options Object with NotificationOptions.
 */
export function inform(options) {
  const defaults = {
    type: 'basic',
    iconUrl: browser.extension.getURL('icons/fmr-color-64.png'),
  };

  // Title and Message properties are required
  if (!options.title || !options.message) return;

  browser.notifications.create(Object.assign(options, defaults));
}

/**
 * Displays an error notification.
 *  {title, message} options are required.
 * @param {*} options Object with NotificationOptions.
 */
export function error(options) {
  const defaults = {
    type: 'basic',
    iconUrl: browser.extension.getURL('icons/error-icon.png'),
  };

  // Title and Message properties are required
  if (!options.title || !options.message) return;

  browser.notifications.create(Object.assign(options, defaults));
}
