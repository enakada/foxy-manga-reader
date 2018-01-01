import moment from 'moment';
import * as Sidebar from './util/sidebar';
import * as MangaList from './util/list';
import * as Notification from '../util/notification';
import store from '../util/datastore';

const mangaListDom = document.getElementById('manga-list');


// Event listeners
// ////////////////////////////////////////////////////////////////

document.addEventListener('click', Sidebar.expandButtonListener);
document.addEventListener('change', Sidebar.viewModeListener);


// Runtime messages
// ////////////////////////////////////////////////////////////////

function updateCurrentChapter(bookmark) {
  const mangaDom = document.getElementById(`${bookmark.source}-${bookmark.reference}`);

  const meta = mangaDom.getElementsByTagName('span')[0];
  meta.textContent = `Last read: ${moment(bookmark.last_read.date).format('LL')}`;

  const chapterSel = mangaDom.getElementsByTagName('select')[0];

  chapterSel.selectedIndex = bookmark.last_read.chapter.id;

  const uptodate = bookmark.last_read.chapter.index === chapterSel.options.length - 1;
  if (uptodate) {
    chapterSel.classList.replace('bg-danger', 'bg-success');
    mangaDom.classList.add('flex-last');
    Sidebar.updateChart(-1, 1);
  }
}

function updateChapterList(bookmark, chapterList) {
  const mangaDom = document.getElementById(`${bookmark.source}-${bookmark.reference}`);
  const wasUptodate = mangaDom.classList.contains('flex-last');

  const chapterSel = mangaDom.getElementsByTagName('select')[0];

  if (wasUptodate) {
    mangaDom.classList.remove('flex-last');
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
    if (!mangaListDom) throw new Error('manga-list element does not exist in DOM');

    const storage = await browser.storage.sync.get();

    // Initialize sidebar
    Sidebar.init({
      last_update: storage.last_chapter_update,
    });

    // Select view mode
    const radio = document.getElementById(storage.view_mode || 'single');
    if (radio) radio.parentNode.className += ' active';

    // Select sidebar mode
    const iconBtn = document.getElementById('sidebar-expand-btn');
    if (storage.sidebar_collapsed) Sidebar.collapse(iconBtn.firstElementChild);

    // Update badge_count
    if (storage && storage.badge_count > 0) {
      browser.browserAction.setBadgeBackgroundColor({ color: '' });
      browser.browserAction.setBadgeText({ text: '' });

      storage.badge_count = 0;
      await browser.storage.sync.set({ badge_count: storage.badge_count });
    }

    // console.debug(storage);
    let readCount = 0;

    // Append manga list
    if (storage && storage.bookmark_list) {
      const promises = storage.bookmark_list.map(async (bookmark) => {
        const manga = await store.getItem(`${bookmark.source}/${bookmark.reference}`);
        if (!manga) return;

        const card = MangaList.createMangaCard(bookmark, manga);
        mangaListDom.appendChild(card);

        if (card.classList.contains('flex-last')) readCount += 1;
      });

      await Promise.all(promises);
    }

    // Update chart
    Sidebar.updateChart(mangaListDom.childElementCount - readCount, readCount);
  } catch (err) {
    console.error(`Error while starting the browser action script: ${err}`); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: browser.i18n.getMessage('generalErrorNotificationTitle'),
      message: browser.i18n.getMessage('generalErrorNotificationMessage'),
    });
  }
};
