import moment from 'moment';
import * as Sidebar from './sidebar';

// Event Listeners
// ////////////////////////////////////////////////////////////////

/**
 * Opens new tab with the selected manga chapter when btn-read button is clicked.
 */
export async function readButtonListener(e) {
  try {
    const select = e.target.parentElement.parentElement.firstElementChild;
    await browser.tabs.create({ url: select.options[select.selectedIndex].dataset.url });
  } catch (err) {
    console.error(`Error while accessing chapter page: ${err}`); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: browser.i18n.getMessage('readChapterButtonErrorNotificationTitle'),
      message: browser.i18n.getMessage('readChapterButtonErrorNotificationMessage'),
    });
  }
}

/**
 * Unbookmarks manga when btn-remove button is clicked.
 */
export async function unbookmarkButtonListener(e) {
  const card = e.target.parentElement;
  const mangaListDom = document.getElementById('manga-list');

  try {
    const result = await browser.runtime.sendMessage({
      type: 'unbookmark',
      manga_url: card.dataset.mangaUrl,
    });

    if (result) {
      mangaListDom.removeChild(card);

      if (card.classList.contains('flex-last')) Sidebar.updateChart(0, -1);
      else Sidebar.updateChart(-1, 0);
    }
  } catch (err) {
    console.error(`Error while unbookmarking manga from browser action script: ${err}`); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: browser.i18n.getMessage('unbookmarkMangaErrorNotificationTitle'),
      message: browser.i18n.getMessage('unbookmarkMangaErrorNotificationmessage'),
    });
  }
}

// DOM Creation Methods
// ////////////////////////////////////////////////////////////////

/**
 * Creates a new Manga <li> Element
 * @param {*} manga object defining the manga
 * @returns <li> html element
 */
export function createMangaCard(bookmark, manga) {
  const upToDate = bookmark.last_read.chapter.id === manga.chapter_list[manga.chapter_list.length - 1].id;

  const mangaDiv = document.createElement('div');
  mangaDiv.id = `${bookmark.source}-${bookmark.reference}`;
  mangaDiv.className = 'row p-2 m-1';
  mangaDiv.dataset.mangaUrl = manga.url;
  mangaDiv.dataset.mangaSid = manga.sid;

  if (upToDate) mangaDiv.classList.add('flex-last');

  const imageDiv = document.createElement('div');
  imageDiv.className = 'col-2 p-0';
  mangaDiv.appendChild(imageDiv);

  // Add cover image
  const mangaCover = document.createElement('img');
  mangaCover.className = 'img-fluid align-middle';
  mangaCover.src = manga.cover;
  imageDiv.appendChild(mangaCover);

  const mangaData = document.createElement('div');
  mangaData.className = 'manga-data col-9 d-flex flex-column';
  mangaDiv.appendChild(mangaData);

  // Add Manga title
  const title = document.createElement('h6');
  title.textContent = manga.name;
  title.className = 'title';
  mangaData.appendChild(title);

  // Add Manga metadata
  const meta = document.createElement('span');
  meta.textContent = `Last read: ${moment(bookmark.last_read.date).format('LL')}`;
  mangaData.appendChild(meta);

  // Input group
  const inputGroup = document.createElement('div');
  inputGroup.className = 'input-group input-group-sm my-2';
  mangaData.appendChild(inputGroup);

  // Add chapters
  const chapterSelect = document.createElement('select');
  inputGroup.appendChild(chapterSelect);
  if (upToDate) {
    chapterSelect.className = 'custom-select form-control form-control-sm p-0 pr-4 bg-success';
  } else {
    chapterSelect.className = 'custom-select form-control form-control-sm p-0 pr-4 bg-danger text-white';
  }

  manga.chapter_list.slice().reverse().forEach((chapter) => {
    const option = document.createElement('option');
    option.value = chapter.id;
    option.text = chapter.name;
    option.dataset.url = chapter.url;

    if (chapter.id === bookmark.last_read.chapter.id) option.selected = true;

    chapterSelect.appendChild(option);
  });

  const btnGroup = document.createElement('div');
  btnGroup.className = 'd-flex justify-content-around';
  mangaData.appendChild(btnGroup);

  // Input group button
  const inputGroupBtn = document.createElement('span');
  inputGroupBtn.className = 'input-group-btn';
  inputGroup.appendChild(inputGroupBtn);

  // Add Read button
  const goBtn = document.createElement('button');
  goBtn.className = 'btn btn-outline-info';
  goBtn.innerHTML = 'Read';
  goBtn.type = 'button';
  goBtn.onclick = readButtonListener;
  inputGroupBtn.appendChild(goBtn);

  // Add Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'col-1 p-0 btn btn-link';
  removeBtn.title = 'Remove Manga';
  removeBtn.innerHTML = '<span class="oi oi-x" aria-hidden="true"></span>';
  goBtn.type = 'button';
  removeBtn.onclick = unbookmarkButtonListener;
  mangaDiv.appendChild(removeBtn);

  return mangaDiv;
}
