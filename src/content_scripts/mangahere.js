import * as Util from './util';

const pageRegex = /(((?:http\w*:\/\/)*[\w.]*mangahere\.\w{2,3}\/manga\/(\w+)\/)(\S+)\/)(?:(\d+)\.html)?/;


// Page Utils
// ////////////////////////////////////////////////////////////////

/**
 * Returns the number of pages of a manga.
 * @returns {int} The total number of pages of the current manga chapter.
 */
function getNumberOfPages() {
  const topBarElem = document.getElementById('top_chapter_list').parentElement;
  if (!topBarElem) return 0;

  const pageList = topBarElem.getElementsByTagName('select')[1];
  if (!pageList) return 0;

  return pageList.options.length - 1;
}

/**
 * Loads a given number of manga pages to the DOMElement.
 * @param {object~DOMElement} element The element to append the images to.
 * @param {int} start The number of the page to start loading images from.
 * @param {int} end The number of the page to stop loading images from.
 */
function loadImages(element, start, end) {
  if (start > end) return;

  const url = (start === 1)
    ? window.location.href.replace(pageRegex, '$1') : window.location.href.replace(pageRegex, `$1${start}.html`);

  const xhr = new XMLHttpRequest();
  xhr.responseType = 'document';
  xhr.withCredentials = true;

  xhr.addEventListener('readystatechange', function process() {
    if (this.readyState === 4) {
      let div = element;
      if (element.classList.contains('fmr-viewer')) {
        div = document.createElement('div');
        div.classList.add('fmr-img-container');
        element.appendChild(div);
      }

      if (this.status >= 400) {
        Util.appendReloadDiv(div, start, loadImages);
      } else {
        const image = xhr.response.getElementById('image');
        image.style = '';
        image.onerror = () => {
          div.innerHTML = '';
          Util.appendReloadDiv(div, start, loadImages);
        };

        div.appendChild(image);
      }

      loadImages(element, start + 1, end);
    }
  });

  xhr.open('GET', url);
  xhr.setRequestHeader('Cache-Control', 'no-cache');

  xhr.send();
}

/**
 * Removes the <a> tag from the current page <img>.
 */
function removeImgLink() {
  const viewerDiv = document.getElementById('viewer');
  const image = document.getElementById('image');

  const div = document.createElement('div');
  div.appendChild(image);

  viewerDiv.innerHTML = '';
  viewerDiv.appendChild(div);
}

/**
 * Removes the page side ad bars
 */
function removeSideAds() {
  const rightAd = document.getElementById('right_skyscraper');
  if (rightAd) rightAd.style = 'display: none';

  const leftAd = document.getElementById('left_skyscraper');
  if (leftAd) leftAd.style = 'display: none';
}

/**
 * Removes the page selector
 */
function removePageSelector() {
  const goPageList = document.getElementsByClassName('go_page');
  for (let i = 0; i < goPageList.length; i += 1) {
    const selector = goPageList.item(i).getElementsByTagName('span')[0];
    if (!selector) {
      console.error('Could not remove page selector'); // eslint-disable-line no-console
      return;
    }

    selector.style = 'display: none';
  }
}


// View Modes
// ////////////////////////////////////////////////////////////////

/**
 * Activates the infinite scrolling view mode.
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function infiniteScrolling(viewerDiv) {
  // Find number of pages
  const pageCount = getNumberOfPages();

  loadImages(viewerDiv, 1, pageCount);
}

/**
 * Activates the dual page view mode.
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function dualPage(viewerDiv) {
  // Find number of pages
  const pageCount = getNumberOfPages();

  const m = pageRegex.exec(window.location.href);
  if (!m) {
    console.error('Could not parse current page number'); // eslint-disable-line no-console
    return;
  }

  const nextPage = (m[5]) ? parseInt(m[5], 10) + 1 : 2;

  if (nextPage > pageCount) return;

  loadImages(viewerDiv, nextPage, nextPage);
}

// Other
// ////////////////////////////////////////////////////////////////

function displayMenu(matchUrl, viewMode) {
  const chapterList = document.getElementById('top_chapter_list').options;
  if (!chapterList) return;

  // Parse chapter links
  const curChapterIndex = chapterList.selectedIndex;
  if (curChapterIndex === -1) return;

  const nextChapter = (curChapterIndex < chapterList.length - 1)
    ? `${chapterList[curChapterIndex + 1].value}` : '';
  const previousChapter = (curChapterIndex > 0) ? `${chapterList[curChapterIndex - 1].value}` : '';

  // Parse page links
  const topBarElem = document.getElementById('top_chapter_list').parentElement;
  if (!topBarElem) return;

  const pageList = topBarElem.getElementsByTagName('select')[1];
  if (!pageList) return;

  const pageIncrement = (viewMode !== 'dual') ? 1 : 2;

  const curPageIndex = pageList.selectedIndex;
  if (curPageIndex === -1) return;

  let nextPage = '';
  if (curPageIndex < pageList.length - pageIncrement - 1) {
    nextPage = `${pageList[curPageIndex + pageIncrement].value}`;
  } else if (pageIncrement > 1 && curPageIndex < pageList.length - 2) {
    nextPage = `${pageList[curPageIndex + 1].value}`;
  }

  let previousPage = '';
  if (curPageIndex > pageIncrement - 1) {
    previousPage = `${pageList[curPageIndex - pageIncrement].value}`;
  } else if (pageIncrement > 1 && curPageIndex > 0) {
    previousPage = `${pageList[curPageIndex - 1].value}`;
  }

  const options = {
    source: 'mangahere',
    reference: matchUrl[3],
    url: {
      current: matchUrl[0],
      home: matchUrl[2],
      nextChapter,
      nextPage,
      previousChapter,
      previousPage,
    },
    pageControls: (viewMode !== 'infinite'),
  };

  Util.appendMenu(options);
}

// On load
// ////////////////////////////////////////////////////////////////

document.onreadystatechange = async () => {
  if (document.readyState !== 'complete') return;

  const match = pageRegex.exec(window.location.href);
  if (!match) return;

  Util.updateCurrentChapter();

  try {
    const viewMode = await Util.getCurrentViewMode();
    if (!viewMode) throw Error('Could not load view mode');

    const viewerDiv = document.getElementById('viewer');
    viewerDiv.classList.add('fmr-viewer');
    viewerDiv.scrollIntoView({ behavior: 'smooth' });

    switch (viewMode) {
      case 'infinite':
        removePageSelector();
        viewerDiv.innerHTML = '';

        Util.appendScrollTopButton(viewerDiv);

        infiniteScrolling(viewerDiv);
        break;
      case 'dual':
        removeSideAds();
        removeImgLink();
        removePageSelector();
        viewerDiv.classList.add('dual-mode');

        dualPage(viewerDiv);
        break;
      default:
        Util.appendScrollTopButton(viewerDiv);
        break;
    }

    displayMenu(match, viewMode);
  } catch (err) {
    console.error(`Could not load the view mode: ${err}`); // eslint-disable-line no-console
  }
};
