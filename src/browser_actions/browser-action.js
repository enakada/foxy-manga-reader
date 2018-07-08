import moment from 'moment';
import { ErrorCode, getError as FoxyError } from '../util/foxyErrors';
import * as Notification from '../util/notification';
import * as Sidebar from './util/sidebar';
import * as MangaList from './util/list';

const mangaListDom = document.getElementById('manga-list');


// Event listeners
// ////////////////////////////////////////////////////////////////

document.addEventListener('click', Sidebar.expandButtonListener);


// List view controller
// ////////////////////////////////////////////////////////////////

async function setListViewMode(viewMode, bookmarkList, shouldUpdateChart = true) {
  let readCount = 0;

  try {
    if (!bookmarkList) throw FoxyError(ErrorCode.NO_STORAGE_BOOKMARK, 'Empty Storage');

    // Clear div if bookmarkList is not empty
    if (bookmarkList.length > 0) mangaListDom.innerHTML = '';

    // Get the correct method to call
    let fn;
    switch (viewMode) {
      case 'list':
        fn = MangaList.createListCard;
        break;
      case 'list-rich':
      default:
        fn = MangaList.createListRichCard;
        break;
    }

    // Append manga list
    const promises = bookmarkList.map(async (bookmark) => {
      // Get Manga data
      const manga = await browser.runtime.sendMessage({
        type: 'get-manga-data',
        manga_key: `${bookmark.source}/${bookmark.reference}`,
      });
      if (!manga) throw FoxyError(ErrorCode.STORE_ERROR, `${bookmark.source}/${bookmark.reference}`); // return;

      const card = fn(bookmark, manga);
      mangaListDom.appendChild(card);

      if (card.classList.contains('order-last')) readCount += 1;
    });

    await Promise.all(promises);
  } catch (err) {
    throw err;
  } finally {
    // Update chart
    if (shouldUpdateChart) Sidebar.updateChart(mangaListDom.childElementCount - readCount, readCount);
  }
}

async function listViewModeListener(e) {
  try {
    const storage = await browser.storage.sync.get('view_mode');

    // Initializes the view_mode and bookmark_list
    if (!storage.view_mode) storage.view_mode = {};

    storage.view_mode.list = e.target.id;
    await browser.storage.sync.set({ view_mode: storage.view_mode });

    // Get the bookmarkList
    const bookmarkList = await browser.runtime.sendMessage({
      type: 'get-bookmark-data',
    });
    bookmarkList.sort((a, b) => {
      const refA = a.reference.toUpperCase();
      const refB = b.reference.toUpperCase();
      if (refA < refB) return -1;
      if (refA > refB) return 1;
      return 0;
    });

    // Append new list
    await setListViewMode(storage.view_mode.list, bookmarkList, false);

    const container = document.getElementById('list-view-mode-container');
    const previousActive = container.getElementsByClassName('active')[0];

    if (previousActive) previousActive.classList.remove('active');

    e.target.parentNode.classList.add('active');
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
}

// Runtime messages
// ////////////////////////////////////////////////////////////////

function updateCurrentChapter(bookmark) {
  const mangaDom = document.getElementById(`${bookmark.source}-${bookmark.reference}`);

  const meta = mangaDom.getElementsByClassName('last-read-span')[0];
  meta.textContent = `Last read: ${moment(bookmark.last_read.date).format('LL')}`;

  // Update <select>
  const chapterSel = mangaDom.getElementsByTagName('select')[0];
  chapterSel.selectedIndex = (chapterSel.options.length - 1) - bookmark.last_read.chapter.index; // List is reversed

  const uptodate = bookmark.last_read.chapter.index === chapterSel.options.length - 1;
  if (uptodate) {
    chapterSel.classList.replace('bg-red', 'bg-green');
    mangaDom.classList.add('order-last');
    Sidebar.updateChart(-1, 1);
  }

  // Update List header
  const chapterTracker = mangaDom.getElementsByClassName('list-chapter-tracker')[0];
  if (chapterTracker) {
    chapterTracker.innerText = chapterTracker.innerText.replace(/\d+\/(\d+)/, `${bookmark.last_read.chapter.index + 1}/$1`);
    if (uptodate) chapterTracker.classList.replace('text-danger', 'text-success');
  }
}

function updateChapterList(bookmark, chapterList) {
  const mangaDom = document.getElementById(`${bookmark.source}-${bookmark.reference}`);
  const wasUptodate = mangaDom.classList.contains('order-last');

  // Update List header
  const chapterTracker = mangaDom.getElementsByClassName('list-chapter-tracker')[0];
  if (chapterTracker) {
    chapterTracker.innerText = chapterTracker.innerText.replace(/(\d+)\/\d+/, `$1/${chapterList.length}`);
  }

  const chapterSel = mangaDom.getElementsByTagName('select')[0];

  if (wasUptodate) {
    mangaDom.classList.remove('order-last');
    chapterSel.classList.replace('bg-success', 'bg-danger');
    Sidebar.updateChart(1, -1);
  }

  // Modify chapters
  chapterSel.options.length = 0;
  chapterList.slice().reverse().forEach((chapter) => {
    const option = document.createElement('option');
    option.value = chapter.id;
    option.text = chapter.name;
    option.dataset.url = chapter.url;

    if (chapter.id === bookmark.last_read.chapter.id) option.selected = true;

    chapterSel.appendChild(option);
  });
}

browser.runtime.onMessage.addListener((message, sender) => {
  // Accept only messages from the background page
  if (sender.envType !== 'addon_child') return;

  switch (message.type) {
    case 'update-current-chapter':
      updateCurrentChapter(message.bookmark);
      break;
    case 'update-chapter-list':
      updateChapterList(message.bookmark, message.chapterList);
      break;
    default:
      break;
  }
});


// On window load
// ////////////////////////////////////////////////////////////////

/**
 * On windown.onload event, clear any badge text and create the manga
 * list DOM tree.
 */
window.onload = async () => {
  try {
    // Sanity check the DOM
    if (!mangaListDom) throw FoxyError(ErrorCode.DOM_MISSING, 'manga-list');

    const storage = await browser.storage.sync.get();

    // Initialize sidebar
    Sidebar.init({
      last_update: storage.last_chapter_update,
    });

    // Initialize storage.view_mode
    if (!storage.view_mode) storage.view_mode = {};

    // Initialize version
    const versionDiv = document.getElementById('addon-version');
    versionDiv.innerText = `v${browser.runtime.getManifest().version}`;

    // Select view mode
    const radio = document.getElementById(storage.view_mode.manga || 'single');
    if (radio) radio.parentNode.classList.add('active');

    // Select manga list view mode
    const listViewRadio = document.getElementById(storage.view_mode.list || 'list-rich');
    if (listViewRadio) listViewRadio.parentNode.classList.add('active');

    // Select sidebar mode
    const iconBtn = document.getElementById('sidebar-expand-btn');
    if (storage.sidebar_collapsed) Sidebar.collapse(iconBtn.firstElementChild);

    // Update badge_count
    if (storage.badge_count > 0) {
      browser.browserAction.setBadgeText({ text: '' });

      storage.badge_count = 0;
      await browser.storage.sync.set({ badge_count: storage.badge_count });
    }

    // Get the bookmarkList
    const bookmarkList = await browser.runtime.sendMessage({
      type: 'get-bookmark-data',
    });
    bookmarkList.sort((a, b) => {
      const refA = a.reference.toUpperCase();
      const refB = b.reference.toUpperCase();
      if (refA < refB) return -1;
      if (refA > refB) return 1;
      return 0;
    });

    // Append manga list
    if (bookmarkList) {
      await setListViewMode(storage.view_mode.list || 'list-rich', bookmarkList);
    }

    // Add listener to list view radio button
    const listViewMode = document.getElementById('list-view-mode-container');
    listViewMode.onchange = listViewModeListener;
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
};
