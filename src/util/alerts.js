/**
 * Appends an alert to the options page.
 * @param {string} type Required. The type of the alert (success or danger).
 * @param {object} options Required. Should contain the 'message' to the alert. The 'title' property is optional.
 * @param {string} id Optional. The 'id' of the DOMElement to append the alert.
 */
export default function appendAlert(type, options = {}, id = 'alerts') {
  const dismisssBtn = document.createElement('button');
  dismisssBtn.type = 'button';
  dismisssBtn.className = 'close';
  dismisssBtn.dataset.dismiss = 'alert';
  dismisssBtn.innerHTML = '<span aria-hidden="true">&times;</span>';

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.setAttribute('role', 'alert');

  const titleDom = document.createElement('strong');
  if (options.title) titleDom.innerText = `${options.title} `;

  alert.appendChild(dismisssBtn);
  alert.appendChild(titleDom);
  alert.appendChild(document.createTextNode(options.message));

  const alertDiv = document.getElementById(id);

  alertDiv.appendChild(alert);
}
