import { ErrorCode, getError as FoxyError } from './foxyErrors';
import Cloudscrapper from './cloudscrapper';

/**
 * Fetches a new URL in order to solve a challenge (cloudflare ...).
 * @param {string} url Required. String representing the URL to fetch (GET).
 * @param {object} headers Required. The object with the headers to send.
 * @returns {object} A promise which resolves to the HTMLDocument of the response body or its string representation.
 */
async function solveChallenge(url, headers) {
  const options = {
    headers,
    credentials: 'include',
  };

  try {
    const res = await window.fetch(url, options);
    if (res.ok) {
      const body = await res.text();

      const resType = res.headers.get('Content-Type');
      const parser = new DOMParser();
      const parsedResponse = (resType.indexOf('text/html') !== -1) ? parser.parseFromString(body, 'text/html') : String(body);

      return Promise.resolve(parsedResponse);
    }

    return Promise.reject(FoxyError(ErrorCode.SOURCE_SERVER_ERROR, `${res.status} ${res.statusText}`));
  } catch (err) {
    return Promise.reject(err);
  }
}

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
        const res = await window.fetch(url, {
          credentials: 'include',
          cache: 'no-cache',
        });

        if (res.ok) {
          const body = await res.text();

          const resType = res.headers.get('Content-Type');
          const parser = new DOMParser();
          const parsedResponse = (resType.indexOf('text/html') !== -1) ? parser.parseFromString(body, 'text/html') : String(body);

          resolve(onSuccess(parsedResponse));
        } else if (res.status === 503 && (res.headers.get('Server') === 'cloudflare' || url.includes('kissmanga'))) { // Cloudscrapper
          const body = await res.text();
          const answer = Cloudscrapper(res, body);

          // Wait for 5sec before answering cloudflare challenge
          setTimeout(async () => {
            try {
              const resBody = await solveChallenge(answer, { Referer: res.url });
              if (resBody) fetchAndRetry(n);
            } catch (err) {
              reject(FoxyError(ErrorCode.SOURCE_CLIENT_ERROR, `${res.status} ${res.statusText}`));
            }
          }, 5000);
        } else if (res.status >= 500) {
          throw FoxyError(ErrorCode.SOURCE_SERVER_ERROR, `${res.status} ${res.statusText}`);
        } else {
          reject(FoxyError(ErrorCode.SOURCE_CLIENT_ERROR, `${res.status} ${res.statusText}`));
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
