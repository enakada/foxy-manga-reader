import * as FoxyStorage from '../util/FoxyStorage';

/**
 * Checks whether or not the manga is bookmarked
 * @param {string} source The source of the manga to check.
 * @param {string} reference The reference of the manga to check.
 */
export async function isBookmarked(source, reference) {
  try {
    const key = `${source}/${reference}`;

    const bookmark = await FoxyStorage.getMetadata(key);
    return (bookmark !== undefined);
  } catch (err) {
    console.error(`Could not check if manga is bookmarked: ${err}`); // eslint-disable-line no-console
    return false;
  }
}

/**
 * Bookmarks the current manga.
 * @param {string} url The current URL.
 * @param {object~DOMElement} bookmarkBtn The bookmark <button>.
 */
export async function bookmarkManga(url, bookmarkBtn) {
  try {
    await browser.runtime.sendMessage({
      type: 'bookmark',
    });

    if (bookmarkBtn) bookmarkBtn.classList.add('bookmarked');
  } catch (err) {
    console.error(`Error while bookmarking manga from content script: ${err}`); // eslint-disable-line no-console
  }
}

/**
 * Unbookmarks the current manga.
 * @param {string} url The current URL.
 * @param {object~DOMElement} bookmarkBtn The bookmark <button>.
 */
export async function unbookmarkManga(url, bookmarkBtn) {
  try {
    await browser.runtime.sendMessage({
      type: 'unbookmark',
    });

    if (bookmarkBtn) bookmarkBtn.classList.remove('bookmarked');
  } catch (err) {
    console.error(`Error while unbookmarking manga from content script: ${err}`); // eslint-disable-line no-console
  }
}

/**
 * Listens to the bookmark button click events.
 * @param {object} e The event object.
 */
export async function bookmarkButtonListener(e) {
  if (e.target.id !== 'fmr-bookmark-btn') return;

  try {
    if (!e.target.classList.contains('bookmarked')) {
      await bookmarkManga(e.target.dataset.mangaUrl, e.target);
    } else {
      await unbookmarkManga(e.target.dataset.mangaUrl, e.target);
    }
  } catch (err) {
    // Do nothing
  }
}

document.addEventListener('click', bookmarkButtonListener);

/**
 * Updates the current chapter of the current manga if it is bookmarked
 */
export async function updateCurrentChapter() {
  try {
    await browser.runtime.sendMessage({
      type: 'update-chapter',
      manga_url: window.location.href,
    });
  } catch (err) {
    console.error(`Error while updating current chapter: ${err}`); // eslint-disable-line no-console
  }
}

/**
 * Creates and appends an image placeholder and the reload button for when a manga page could not be retrieved.
 * Also attaches a reload function to the onclick event.
 * @param {int} pageNumber The page which this button represents.
 * @param {function} onclick The reload function to trigger when button is clicked.
 * @returns {object~DOMElement} The DOMElement of the reload button.
 */
export function appendReloadDiv(parent, pageNumber, onclick) {
  const placeholderUrl = browser.extension.getURL('images/page-default-placeholder.png');

  // Append placeholder image
  const imgTag = document.createElement('img');
  imgTag.src = placeholderUrl;
  parent.appendChild(imgTag);

  // Append reload button
  const button = document.createElement('button');
  button.className = 'fmr-btn btn-reload';
  button.innerHTML = '<span class="oi" data-glyph="reload"></span>';
  button.onclick = (ev) => {
    const elem = ev.target.parentNode;
    elem.innerHTML = '';

    onclick(elem, pageNumber, pageNumber);
  };

  parent.appendChild(button);
}

/**
 * Returns a string representing the current view mode.
 * @returns {string} The string representing the current view mode. It can be one
 *  of the following: 'infinite', 'dual' or 'single'.
 */
export async function getCurrentViewMode() {
  try {
    const storage = await browser.storage.sync.get('view_mode');
    if (!storage.view_mode) storage.view_mode = {};

    return Promise.resolve(storage.view_mode.manga || 'single');
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Appends a scroll to top button to the current document.
 * @param {object~DOMElement} topElem
 */
export function appendScrollTopButton(topElem) {
  const button = document.createElement('button');
  button.className = 'fmr-btn btn-gototop';
  button.innerHTML = '<span class="oi" data-glyph="arrow-circle-top"></span>';
  button.onclick = () => {
    topElem.scrollIntoView({ behavior: 'smooth' });
  };

  document.body.appendChild(button);
}

/**
 * Appends a navigation menu to the current document.
 * @param {object} options
 */
export async function appendMenu(options) {
  const defaults = {
    source: '',
    reference: '',
    url: {
      current: '',
      home: '#',
      nextChapter: '#',
      nextPage: '',
      previousChapter: '#',
      previousPage: '',
    },
    pageControls: true,
  };

  const opts = Object.assign(defaults, options);

  try {
    const bookmarked = await isBookmarked(opts.source, opts.reference);

    const navDiv = document.createElement('div');
    navDiv.id = 'fmr-navbar';
    navDiv.className = 'flex';

    const homeBtn = document.createElement('button');
    navDiv.appendChild(homeBtn);
    homeBtn.title = browser.i18n.getMessage('homeButtonTitle');
    homeBtn.innerHTML = '<span class="oi" data-glyph="home" aria-hidden="true"></span>';
    homeBtn.className = 'fmr-btn';
    homeBtn.onclick = () => {
      window.location.href = opts.url.home;
    };

    const bookmarkBtn = document.createElement('button');
    navDiv.appendChild(bookmarkBtn);
    bookmarkBtn.id = 'fmr-bookmark-btn';
    bookmarkBtn.innerHTML = '<span class="oi" data-glyph="bookmark" aria-hidden="true"></span>';
    bookmarkBtn.className = 'fmr-btn';
    bookmarkBtn.dataset.mangaUrl = opts.url.current;
    bookmarkBtn.title = (bookmarked) ? browser.i18n.getMessage('unbookmarkButtonTitle') : browser.i18n.getMessage('bookmarkButtonTitle');
    if (bookmarked) bookmarkBtn.classList.add('bookmarked');

    const prevChapterBtn = document.createElement('button');
    navDiv.appendChild(prevChapterBtn);
    prevChapterBtn.title = browser.i18n.getMessage('previousChapterButtonTitle');
    prevChapterBtn.innerHTML = '<span class="oi" data-glyph="media-step-backward" aria-hidden="true"></span>';
    prevChapterBtn.className = (opts.url.previousChapter) ? 'fmr-btn' : 'fmr-btn disabled';
    if (opts.url.previousChapter) {
      prevChapterBtn.onclick = () => {
        window.location.href = opts.url.previousChapter;
      };
    }

    if (opts.pageControls) {
      const prevPageBtn = document.createElement('button');
      navDiv.appendChild(prevPageBtn);
      prevPageBtn.title = browser.i18n.getMessage('previousPageButtonTitle');
      prevPageBtn.innerHTML = '<span class="oi" data-glyph="chevron-left" aria-hidden="true"></span>';
      prevPageBtn.className = (opts.url.previousPage) ? 'fmr-btn' : 'fmr-btn disabled';
      if (opts.url.previousPage) {
        if (typeof opts.url.previousPage === 'function') {
          prevPageBtn.onclick = opts.url.previousPage;
        } else {
          prevPageBtn.onclick = () => {
            window.location.href = opts.url.previousPage;
          };
        }
      }
    }

    const nextChapterBtn = document.createElement('button');
    navDiv.appendChild(nextChapterBtn);
    nextChapterBtn.title = browser.i18n.getMessage('nextChapterButtonTitle');
    nextChapterBtn.innerHTML = '<span class="oi" data-glyph="media-step-forward" aria-hidden="true"></span>';
    nextChapterBtn.className = (opts.url.nextChapter) ? 'fmr-btn' : 'fmr-btn disabled';
    if (opts.url.nextChapter) {
      nextChapterBtn.onclick = () => {
        window.location.href = opts.url.nextChapter;
      };
    }

    if (opts.pageControls) {
      const nextPageBtn = document.createElement('button');
      navDiv.appendChild(nextPageBtn);
      nextPageBtn.title = browser.i18n.getMessage('nextPageButtonTitle');
      nextPageBtn.innerHTML = '<span class="oi" data-glyph="chevron-right"></span>';
      nextPageBtn.className = (opts.url.nextPage) ? 'fmr-btn' : 'fmr-btn disabled';
      if (opts.url.nextPage) {
        if (typeof opts.url.nextPage === 'function') {
          nextPageBtn.onclick = opts.url.nextPage;
        } else {
          nextPageBtn.onclick = () => {
            window.location.href = opts.url.nextPage;
          };
        }
      }
    }

    document.body.appendChild(navDiv);
  } catch (err) {
    console.error(`Could not create navigation menu: ${err}`); // eslint-disable-line no-console
  }
}
