import * as Util from './util';

const pageRegex = /(((?:http\w*:\/\/)*mangafox\.\w+\/manga\/(\w+)\/)(\S+)\/)(\d+)(\.html)/;


// Page Utils
// ////////////////////////////////////////////////////////////////

/**
 * Returns the number of pages of a manga.
 * @returns {int} The total number of pages of the current manga chapter.
 */
function getNumberOfPages() {
  const topBarElem = document.getElementById('top_bar');
  if (!topBarElem) return 0;

  const selectElemList = topBarElem.getElementsByTagName('select');
  if (!selectElemList) return 0;

  let selectElem;
  for (let i = 0; i < selectElemList.length; i += 1) {
    if (selectElemList[i].className === 'm') {
      selectElem = selectElemList[i];
      break;
    }
  }

  if (!selectElem) return 0;

  return selectElem.options.length - 1;
}

/**
 * Loads a given number of manga pages to the DOMElement.
 * @param {object~DOMElement} element The element to append the images to.
 * @param {int} start The number of the page to start loading images from.
 * @param {int} end The number of the page to stop loading images from.
 */
function loadImages(element, start, end) {
  if (start > end) return;

  const url = window.location.href.replace(pageRegex, `$1${start}$6`);

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
        const viewer = this.responseXML.getElementById('viewer');
        const image = viewer.getElementsByTagName('img');
        image[0].onerror = () => {
          div.innerHTML = '';
          Util.appendReloadDiv(div, start, loadImages);
        };

        div.appendChild(image[0]);
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
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function removeImgLink(viewerDiv) {
  const div = viewerDiv.getElementsByTagName('div')[0];
  const image = viewerDiv.getElementsByTagName('img')[0];

  div.innerHTML = '';
  div.appendChild(image);
}

/**
 * Removes the page side ad bars
 */
function removeSideAds() {
  const rightAd = document.getElementById('right-skyscraper');
  if (rightAd) rightAd.style = 'display: none';

  const leftAd = document.getElementById('left-skyscraper');
  if (leftAd) leftAd.style = 'display: none';
}

/**
 * Removes the page selector
 */
function removePageSelector() {
  const goPageList = document.getElementsByClassName('r m');
  for (let i = 0; i < goPageList.length; i += 1) {
    const selector = goPageList.item(i);
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

  try {
    await loadImages(viewerDiv, 1, pageCount);
  } catch (err) {
    throw err;
  }
}

/**
 * Activates the dual page view mode.
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function dualPage(viewerDiv) {
  // Find number of pages
  const pageCount = getNumberOfPages();

  try {
    const m = pageRegex.exec(window.location.href);
    if (!m) throw Error('Could not parse current page number');

    const nextPage = parseInt(m[5], 10) + 1;

    if (nextPage > pageCount) return;

    await loadImages(viewerDiv, nextPage, nextPage);
  } catch (err) {
    throw err;
  }
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
    ? `${matchUrl[2]}${chapterList[curChapterIndex + 1].value}/1.html` : '';
  const previousChapter = (curChapterIndex > 0) ? `${matchUrl[2]}${chapterList[curChapterIndex - 1].value}/1.html` : '';

  // Parse page links
  const topBarElem = document.getElementById('top_bar');
  if (!topBarElem) return;

  const pageList = topBarElem.getElementsByTagName('select')[1];
  if (!pageList) return;

  const pageIncrement = (viewMode !== 'dual') ? 1 : 2;

  const curPageIndex = pageList.selectedIndex;
  if (curPageIndex === -1) return;

  let nextPage = '';
  if (curPageIndex < pageList.length - pageIncrement - 1) {
    nextPage = `${matchUrl[1]}${pageList[curPageIndex + pageIncrement].value}.html`;
  } else if (pageIncrement > 1 && curPageIndex < pageList.length - 2) {
    nextPage = `${matchUrl[1]}${pageList[curPageIndex + 1].value}.html`;
  }

  let previousPage = '';
  if (curPageIndex > pageIncrement - 1) {
    previousPage = `${matchUrl[1]}${pageList[curPageIndex - pageIncrement].value}.html`;
  } else if (pageIncrement > 1 && curPageIndex > 0) {
    previousPage = `${matchUrl[1]}${pageList[curPageIndex - 1].value}.html`;
  }

  const options = {
    source: 'mangafox',
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

    displayMenu(match, viewMode);

    switch (viewMode) {
      case 'infinite':
        removePageSelector();
        viewerDiv.innerHTML = '';

        Util.appendScrollTopButton(viewerDiv);

        infiniteScrolling(viewerDiv);
        break;
      case 'dual':
        removeImgLink(viewerDiv);
        removeSideAds();
        removePageSelector();
        viewerDiv.classList.add('dual-mode');

        dualPage(viewerDiv);
        break;
      default:
        Util.appendScrollTopButton(viewerDiv);
        break;
    }
  } catch (err) {
    console.error(`Could not load the view mode: ${err}`); // eslint-disable-line no-console
  }
};
