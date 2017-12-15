/**
 * Sends a GET request to a URL.
 * @param {string} url The url to send a GET request.
 * @param {callback} onSuccess The function to call when the request is successful.
 * @returns {Promise} A promise which resolves to the onSuccess callback.
 */
async function sendRequest(url, onSuccess) {
  return new Promise((resolve, reject) => {
    // Build the request
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    // On sucess, call onSuccess with the response body
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status <= 300) {
        const responseType = xhr.getResponseHeader('Content-Type');
        const parser = new DOMParser();
        const response = (xhr.response && responseType.indexOf('text/html') !== -1) ? parser.parseFromString(xhr.response, 'text/html') : xhr.response;

        resolve(onSuccess(response));
      } else {
        reject(xhr.statusText);
      }
    };

    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
  });
}

export default sendRequest;
