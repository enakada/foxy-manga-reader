import * as Util from './util';

const pageRegex = /((((?:http\w*:\/\/)*[\w.]*mangaeden\.\w{2,3})\/[\w/]+-manga\/([\w-]+)\/)([\d.]+)\/)(\d+)\//;


// Page Utils
// ////////////////////////////////////////////////////////////////

/**
 * Returns the number of pages of a manga.
 * @returns {int} The total number of pages of the current manga chapter.
 */
function getNumberOfPages() {
  const pageList = document.getElementById('pageSelect').options;
  return (pageList) ? pageList.length : 0;
}

/**
 * Loads a given number of manga pages to the DOMElement.
 * @param {object~DOMElement} element The element to append the images to.
 * @param {int} start The number of the page to start loading images from.
 * @param {int} end The number of the page to stop loading images from.
 */
function loadImages(element, start, end) {
  if (start > end) return;

  const parentDiv = document.getElementById('image');
  if (!parentDiv) return;

  const imageListString = /var pages = (\[.+\])/g.exec(parentDiv.innerHTML);
  if (!imageListString) return;

  const imageList = JSON.parse(imageListString[1]);
  if (!imageList || imageList.length < end) return;

  for (let i = start; i < end + 1; i += 1) {
    const div = document.createElement('div');
    element.appendChild(div);

    const imgDiv = document.createElement('img');
    imgDiv.alt = `Page ${i}`;
    imgDiv.src = imageList[i - 1].fs;
    imgDiv.height = imageList[i - 1].imageH;
    imgDiv.width = imageList[i - 1].imageW;
    element.appendChild(imgDiv);
  }
}

/**
 * Removes the <a> tag from the current page <img>.
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function removeImgLink(viewerDiv) {
  const a = document.getElementById('nextA');
  const img = document.getElementById('mainImg');

  const div = document.createElement('div');
  div.appendChild(img);

  a.innerHTML = '';

  viewerDiv.appendChild(div);
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
  if (!m) return;

  const nextPage = parseInt(m[6], 10) + 1;

  if (nextPage > pageCount) return;

  loadImages(viewerDiv, nextPage, nextPage);
}

// Other
// ////////////////////////////////////////////////////////////////

function displayMenu(matchUrl, viewMode) {
  const chapterList = document.getElementById('combobox').options;
  if (!chapterList) return;

  // Parse chapter links
  const curChapterIndex = chapterList.selectedIndex;
  if (curChapterIndex === -1) return;

  const nextChapter = (curChapterIndex > 0)
    ? `${matchUrl[2]}${chapterList[curChapterIndex - 1].value}/1/` : '';
  const previousChapter = (curChapterIndex < chapterList.length - 1) ? `${matchUrl[2]}${chapterList[curChapterIndex + 1].value}/1/` : '';

  const pageList = document.getElementById('pageSelect').options;
  if (!pageList) return;

  const pageIncrement = (viewMode !== 'dual') ? 1 : 2;

  const curPageIndex = pageList.selectedIndex;
  if (curPageIndex === -1) return;

  let nextPage = '';
  if (curPageIndex < pageList.length - pageIncrement - 1) {
    nextPage = `${matchUrl[3]}${pageList[curPageIndex + pageIncrement].value}`;
  } else if (pageIncrement > 1 && curPageIndex < pageList.length - 2) {
    nextPage = `${matchUrl[3]}${pageList[curPageIndex + 1].value}`;
  }

  let previousPage = '';
  if (curPageIndex > pageIncrement - 1) {
    previousPage = `${matchUrl[3]}${pageList[curPageIndex - pageIncrement].value}`;
  } else if (pageIncrement > 1 && curPageIndex > 0) {
    previousPage = `${matchUrl[3]}${pageList[curPageIndex - 1].value}`;
  }

  const options = {
    source: 'mangaeden',
    reference: matchUrl[4],
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

    const viewerDiv = document.getElementById('mainImgC');
    viewerDiv.classList.add('fmr-viewer');
    viewerDiv.scrollIntoView({ behavior: 'smooth' });

    switch (viewMode) {
      case 'infinite':
        viewerDiv.innerHTML = '';
        Util.appendScrollTopButton(viewerDiv);
        infiniteScrolling(viewerDiv);
        break;
      case 'dual':
        removeImgLink(viewerDiv);
        viewerDiv.classList.add('dual-mode');
        viewerDiv.parentElement.style = '';
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
