import sinon from 'sinon';

const sandbox = sinon.sandbox.create();
let count;

/**
 * Mocks an error response from the Fetch API.
 * @param {string} message The fetch Response message.
 * @param {object} options The fetch Response options.
 */
export function error(message, options) {
  const defaults = {
    status: 404,
    statusText: 'Not Found',
  };

  const res = new window.Response(message || '', Object.assign(defaults, options));

  return () => {
    count += 1;
    return Promise.resolve(res);
  };
}

/**
 * Mocks an ok response from the Fetch API.
 * @param {string} message The fetch Response message.
 * @param {object} options The fetch Response options.
 */
export function ok(message, options) {
  const defaults = {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'text/html' },
  };

  const res = new window.Response(message || '', Object.assign(defaults, options));

  return () => {
    count += 1;
    return Promise.resolve(res);
  };
}

/**
 * Initializes the Mock and sets a default 404 error response.
 */
export function init() {
  count = 0;
  sandbox.stub(window, 'fetch');
  window.fetch.callsFake(error());
}

/**
 * Restores the window.fetch method.
 */
export function restore() {
  sandbox.restore();
}

/**
 * Returns the numbers of times the window.fetch method was called during the current test.
 */
export function callCount() {
  return count;
}
