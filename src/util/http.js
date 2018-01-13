/**
 * Uses the Fetch API to request information from an URL. Retries the fetch operation
 * 2 times (defaults) on timeouts or error code > 500.
 * @param {string} url The url to send a GET request.
 * @param {callback} onSuccess The function to call when the request is successful.
 * @param {object} options The options for the retry.
 * @returns {Promise} A promise which resolves to the onSuccess callback.
 */
export default async function fetch(url, onSuccess, options) {
  const defaults = {
    retries: 2,
    retryDelay: 1000,
  };

  const opts = Object.assign(defaults, options);

  return new Promise((resolve, reject) => {
    const fetchAndRetry = async (n) => {
      try {
        const res = await window.fetch(url);
        if (res.ok) {
          const body = await res.text();

          const resType = res.headers.get('Content-Type');
          const parser = new DOMParser();
          const parsedResponse = (resType.indexOf('text/html') !== -1) ? parser.parseFromString(body, 'text/html') : String(body);

          resolve(onSuccess(parsedResponse));
        } else if (res.status >= 500) {
          throw new Error(res.statusText);
        } else {
          reject(res.statusText);
        }
      } catch (err) {
        if (n > 0) {
          setTimeout(() => {
            fetchAndRetry(n - 1);
          }, opts.retryDelay);
        } else {
          reject(err);
        }
      }
    };
    fetchAndRetry(opts.retries);
  });
}
