import moment from 'moment';
import Chart from 'chart.js';
import { getError as FoxyError } from '../../util/foxyErrors';
import * as Notification from '../../util/notification';

/**
 * Expands the sidebar.
 * @param {object~DOMElement} iconSpan The span element of the collapse/expand icon.
 */
export function expand(iconSpan) {
  const leftPanel = document.getElementById('left-panel');
  leftPanel.className = 'col-4';

  const rightPanel = document.getElementById('right-panel');
  rightPanel.classList.replace('col-11', 'col-8');

  const chartDiv = document.getElementById('chart-container');
  chartDiv.style = 'display: block';

  const lastUpdate = document.getElementById('last-update');
  lastUpdate.classList.remove('btn', 'btn-link', 'disabled');
  lastUpdate.insertAdjacentText('beforeend', ` ${lastUpdate.firstElementChild.title}`);

  const viewModeContainer = document.getElementById('view-mode-container');
  viewModeContainer.classList.remove('d-flex', 'flex-column');

  viewModeContainer.parentElement.firstElementChild.style = 'display: inherit';

  const settingsBtn = document.getElementById('options-btn');
  if (!settingsBtn.lastChild.textContent) {
    settingsBtn.insertAdjacentText('beforeend', ` ${settingsBtn.firstElementChild.title}`);
  }

  iconSpan.classList.replace('oi-chevron-right', 'oi-chevron-left');
}

/**
 * Collapses the sidebar.
 * @param {object~DOMElement} iconSpan The span element of the collapse/expand icon.
 */
export function collapse(iconSpan) {
  const leftPanel = document.getElementById('left-panel');
  leftPanel.className = 'col-1 collapsed';

  const rightPanel = document.getElementById('right-panel');
  rightPanel.classList.replace('col-8', 'col-11');

  const chartDiv = document.getElementById('chart-container');
  chartDiv.style = 'display: none';

  const lastUpdate = document.getElementById('last-update');
  lastUpdate.classList.remove('btn', 'btn-link', 'disabled');
  lastUpdate.lastChild.textContent = '';

  const viewModeContainer = document.getElementById('view-mode-container');
  viewModeContainer.classList.add('d-flex', 'flex-column');

  viewModeContainer.parentElement.firstElementChild.style = 'display: none';

  const settingsBtn = document.getElementById('options-btn');
  settingsBtn.lastChild.textContent = '';

  iconSpan.classList.replace('oi-chevron-left', 'oi-chevron-right');
}

/**
 * Listens to 'click' events on the expand button.
 * @param {*} e
 */
export function expandButtonListener(e) {
  if (e.target.id !== 'sidebar-expand-btn') return;

  if (e.target.firstElementChild.classList.contains('oi-chevron-left')) {
    collapse(e.target.firstElementChild);
    browser.storage.sync.set({ sidebar_collapsed: true });
  } else {
    expand(e.target.firstElementChild);
    browser.storage.sync.set({ sidebar_collapsed: false });
  }
}

/**
 * Listens to 'change' events on the view mode container.
 */
export async function viewModeListener(e) {
  try {
    const storage = await browser.storage.sync.get('view_mode');
    storage.view_mode.manga = e.target.id;

    await browser.storage.sync.set(storage);

    const container = document.getElementById('view-mode-container');
    const previousActive = container.getElementsByClassName('active')[0];

    if (previousActive) previousActive.classList.remove('active');

    e.target.parentNode.classList.add('active');
  } catch (err) {
    console.error(`Could not change the view mode: ${err}`); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', err.message),
    });
  }
}

// Chart.js Methods
// ////////////////////////////////////////////////////////////////

let chart;

/**
 * Updates the chart values.
 * @param {int} unreadIncrement The number of unread manga to add.
 * @param {int} readIncrement The number of read manga to add.
 */
export function updateChart(unreadIncrement = 0, readIncrement = 0) {
  chart.data.datasets[0].data[0] += unreadIncrement;
  chart.data.datasets[0].data[1] += readIncrement;
  chart.update();
}

/**
 * Initializes the sidebar with correct values.
 * @param {*} userConfig The object with user configurations for the sidebar.
 */
export function init(userConfig = {}) {
  const defaults = {
    chart_data: [0, 0],
    last_update: '',
  };

  const configs = Object.assign(defaults, userConfig);

  // Init options button
  const optBtn = document.getElementById('options-btn');
  optBtn.onclick = () => { browser.runtime.openOptionsPage(); };

  // Init canvas
  const canvasElem = document.getElementById('progress-chart').getContext('2d');
  chart = new Chart(canvasElem, {
    type: 'doughnut',
    data: {
      labels: ['Unread', 'Read'],
      datasets: [{
        data: configs.chart_data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(152, 251, 152, 0.2)',
        ],
        borderColor: [
          'rgba(255,99,132,1)',
          'rgba(46, 139, 87, 1)',
        ],
        borderWidth: 1,
      }],
    },
    options: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
  });

  // Init update time
  const value = (configs.last_update) ? moment(configs.last_update).fromNow() : moment().fromNow();
  const lastUpdateText = browser.i18n.getMessage('lastUpdateText', `${value}`);

  const lastUpdateDiv = document.getElementById('last-update');
  lastUpdateDiv.firstElementChild.title = lastUpdateText;

  const leftPanel = document.getElementById('left-panel');
  if (!leftPanel.classList.contains('collapsed')) lastUpdateDiv.insertAdjacentText('beforeend', ` ${lastUpdateText}`);

  // Add listener to view-mode-container
  const viewMode = document.getElementById('view-mode-container');
  viewMode.onchange = viewModeListener;
}
