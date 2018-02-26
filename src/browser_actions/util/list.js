import moment from 'moment';
import { getError as FoxyError } from '../../util/foxyErrors';
import * as Notification from '../../util/notification';
import * as Sidebar from './sidebar';

// Event Listeners
// ////////////////////////////////////////////////////////////////

/**
 * Opens new tab with the selected manga chapter when btn-read button is clicked.
 */
async function readButtonListener(e) {
  try {
    const select = e.target.parentElement.parentElement.firstElementChild;
    await browser.tabs.create({ url: select.options[select.selectedIndex].dataset.url });
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', err.message),
    });
  }
}

/**
 * Unbookmarks manga when btn-remove button is clicked.
 */
async function unbookmarkButtonListener(e) {
  const card = document.getElementById(e.target.dataset.target);
  const mangaListDom = document.getElementById('manga-list');

  try {
    const result = await browser.runtime.sendMessage({
      type: 'unbookmark',
      manga_url: e.target.dataset.mangaUrl,
      manga_key: e.target.dataset.mangaKey,
    });

    if (result) {
      mangaListDom.removeChild(card);

      if (card.classList.contains('order-last')) Sidebar.updateChart(0, -1);
      else Sidebar.updateChart(-1, 0);

      // Notify user
      Notification.inform({
        title: browser.i18n.getMessage('unbookmarkMangaNotificationTitle'),
        message: browser.i18n.getMessage('unbookmarkMangaNotificationMessage'),
      });
    }
  } catch (err) {
    console.error(err); // eslint-disable-line no-console

    // Notify user that an error occurred
    Notification.error({
      title: (err.code) ? err.message : FoxyError().message,
      message: browser.i18n.getMessage('errorMessage', (err.code) ? JSON.stringify(err.params) : err.message),
    });
  }
}

// DOM Creation Methods
// ////////////////////////////////////////////////////////////////

/**
 * Creates and returns an Unbookmark button.
 * @param {object} options The options to apply to the button.
 */
function createRemoveButton(options = {}) {
  const defaults = {
    class: ['p-0'],
    title: 'Remove Manga',
    target: '',
    url: '',
    key: '',
  };

  const opts = Object.assign(defaults, options);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';

  removeBtn.className = 'btn btn-link btn-inverted';
  removeBtn.classList.add(...opts.class);
  removeBtn.title = opts.title;
  removeBtn.innerHTML = '<span class="oi oi-trash" aria-hidden="true"></span>';
  removeBtn.onclick = unbookmarkButtonListener;

  removeBtn.dataset.target = opts.target;
  removeBtn.dataset.mangaUrl = opts.url;
  removeBtn.dataset.mangaKey = opts.key;

  return removeBtn;
}

/**
 * Creates a the chapter selection <div>.
 * @param {array} chapterList The list of chapters to append.
 * @param {string} lastReadId The id of the last chapter read.
 * @param {boolean} isUpToDate Whether or not the manga is up to date.
 */
function createChapterList(chapterList, lastReadId, isUpToDate) {
  // Input group
  const inputGroup = document.createElement('div');
  inputGroup.className = 'input-group my-2';

  // Add chapters
  const chapterSelect = document.createElement('select');
  chapterSelect.className = 'custom-select custom-select-sm p-0 pr-4';
  chapterSelect.style = '-moz-appearance: none';
  inputGroup.appendChild(chapterSelect);
  if (isUpToDate) chapterSelect.classList.add('bg-green');
  else chapterSelect.classList.add('bg-red');

  chapterList.slice().reverse().forEach((chapter) => {
    const option = document.createElement('option');
    option.value = chapter.id;
    option.text = chapter.name;
    option.dataset.url = chapter.url;

    if (chapter.id === lastReadId) option.selected = true;

    chapterSelect.appendChild(option);
  });

  // Input group button
  const inputGroupBtn = document.createElement('div');
  inputGroupBtn.className = 'input-group-append';
  inputGroup.appendChild(inputGroupBtn);

  // Add Read button
  const goBtn = document.createElement('button');
  goBtn.className = 'btn btn-sm btn-outline-info';
  goBtn.innerHTML = 'Read';
  goBtn.type = 'button';
  goBtn.onclick = readButtonListener;
  inputGroupBtn.appendChild(goBtn);

  return inputGroup;
}

/**
 * Creates the manga <div> element.
 * @param {object} bookmark The object defining the bookmark.
 * @param {object} manga The object defining the manga.
 * @param {boolean} isUpToDate Whether or not the manga is up to date.
 * @param {object} userOptions User options to define what should be shown in the div.
 */
function createMangaBlock(bookmark, manga, isUpToDate, userOptions = {}) {
  const defaults = {
    display: {
      cover: true,
      title: true,
      last_read: true,
    },
  };

  const displayOpts = Object.assign(defaults.display, userOptions.display);

  const mangaRow = document.createElement('div');
  mangaRow.className = 'row p-2 m-1';

  // Add cover image
  if (displayOpts.cover) {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'col-2 p-0';
    mangaRow.appendChild(imageDiv);

    const mangaCover = document.createElement('img');
    imageDiv.appendChild(mangaCover);
    mangaCover.className = 'img-fluid align-middle';
    mangaCover.src = manga.cover;
  }

  const mangaData = document.createElement('div');
  mangaData.className = 'manga-data col-9 d-flex flex-column';
  if (!displayOpts.cover) mangaData.classList.replace('col-9', 'col-11');
  mangaRow.appendChild(mangaData);

  // Add Manga title
  if (displayOpts.title) {
    const title = document.createElement('h6');
    title.textContent = manga.name;
    title.className = 'title';
    mangaData.appendChild(title);

    const infoIcon = document.createElement('span');
    infoIcon.className = 'oi oi-info ml-1 px-1 text-info';
    infoIcon.title = `Source: ${bookmark.source}`;
    title.appendChild(infoIcon);
  }

  // Add Manga metadata
  if (displayOpts.last_read) {
    const meta = document.createElement('span');
    meta.className = 'last-read-span';
    meta.textContent = `Last read: ${moment(bookmark.last_read.date).format('LL')}`;
    mangaData.appendChild(meta);
  }

  // Add Chapter selection
  const chapterSelectionDiv = createChapterList(manga.chapter_list, bookmark.last_read.chapter.id, isUpToDate);
  mangaData.appendChild(chapterSelectionDiv);

  return mangaRow;
}

/**
 * Creates a new Manga card element for the List Rich view.
 * @param {object} bookmark The object defining the manga.
 * @param {object} manga The object defining the manga.
 * @returns <div> html element
 */
export function createListRichCard(bookmark, manga) {
  const upToDate = bookmark.last_read.chapter.id === manga.chapter_list[manga.chapter_list.length - 1].id;

  const mangaDiv = createMangaBlock(bookmark, manga, upToDate);
  mangaDiv.id = `${bookmark.source}-${bookmark.reference}`;

  if (upToDate) mangaDiv.classList.add('order-last');

  const removeBtn = createRemoveButton({
    class: ['col-1', 'p-0'],
    target: mangaDiv.id,
    url: manga.url,
    key: `${bookmark.source}/${bookmark.reference}`,
  });
  removeBtn.style = 'font-size: 1.3em;';
  mangaDiv.appendChild(removeBtn);

  return mangaDiv;
}

/**
 * Creates a new Manga card element for the List view.
 * @param {object} bookmark The object defining the manga.
 * @param {object} manga The object defining the manga.
 * @returns <div> html element.
 */
export function createListCard(bookmark, manga) {
  const upToDate = bookmark.last_read.chapter.id === manga.chapter_list[manga.chapter_list.length - 1].id;

  const card = document.createElement('div');
  card.className = 'card mx-1';
  card.id = `${bookmark.source}-${bookmark.reference}`;
  if (upToDate) card.classList.add('order-last');

  const cardHeader = document.createElement('div');
  cardHeader.className = 'card-header p-1';
  card.appendChild(cardHeader);

  const headerRow = document.createElement('div');
  headerRow.className = 'row mx-0 align-items-center';
  cardHeader.appendChild(headerRow);

  const titleCol = document.createElement('h6');
  titleCol.className = 'col-7 mb-0';
  headerRow.appendChild(titleCol);

  const headerLink = document.createElement('a');
  headerLink.className = 'link-inverted collapsed';
  headerLink.dataset.toggle = 'collapse';
  headerLink.dataset.parent = '#manga-list';
  headerLink.href = `#collapse-${bookmark.source}-${bookmark.reference}`;
  headerLink.setAttribute('aria-expanded', 'false');
  headerLink.setAttribute('aria-controls', `collapse-${bookmark.source}-${bookmark.reference}`);
  headerLink.innerText = manga.name;
  titleCol.appendChild(headerLink);

  const infoIcon = document.createElement('span');
  infoIcon.className = 'oi oi-info ml-1 px-1 text-info';
  infoIcon.title = `Source: ${bookmark.source}`;
  titleCol.appendChild(infoIcon);

  const chapterCol = document.createElement('div');
  chapterCol.className = 'col-4 text-center list-chapter-tracker';
  chapterCol.innerText = `${bookmark.last_read.chapter.index + 1}/${manga.chapter_list.length}`;
  headerRow.appendChild(chapterCol);
  if (upToDate) chapterCol.classList.add('text-success');
  else chapterCol.classList.add('text-danger');

  const removeBtn = createRemoveButton({
    class: ['col-1', 'p-0'],
    target: card.id,
    url: manga.url,
    key: `${bookmark.source}/${bookmark.reference}`,
  });
  headerRow.appendChild(removeBtn);

  // Card Block
  const collapseDiv = document.createElement('div');
  collapseDiv.id = `collapse-${bookmark.source}-${bookmark.reference}`;
  collapseDiv.className = 'collapse';
  collapseDiv.setAttribute('aria-expanded', 'false');
  card.appendChild(collapseDiv);

  const mangaRow = createMangaBlock(bookmark, manga, upToDate, { display: { title: false } });
  mangaRow.classList.add('card-block');
  collapseDiv.appendChild(mangaRow);

  return card;
}
