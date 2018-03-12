import * as Util from './util';

const pageRegex = /(((?:http\w*:\/\/)*[\w.]*kissmanga\.\w{2,3}\/Manga\/([\w-]+)\/)([\w-]+\?id=\d+))(?:#(\d+))*/;


// Page Utils
// ////////////////////////////////////////////////////////////////

/**
 * Loads a given number of manga pages to the DOMElement.
 * Uses the page custom javascript to make it easier to load the images.
 * Ref.: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
 * @param {object~DOMElement} element The element to append the images to.
 * @param {int} start The number of the page to start loading images from.
 * @param {int} end The number of the page to stop loading images from.
 */
function loadImages(element, start, end) {
  if (start > end) return;

  const imageList = window.wrappedJSObject.lstImages;

  for (let i = start; i < end + 1; i += 1) {
    let div = element;
    if (element.classList.contains('fmr-viewer')) {
      div = document.createElement('div');
      div.classList.add('fmr-img-container');
      element.appendChild(div);
    }

    const imgDiv = document.createElement('img');
    imgDiv.alt = `Page ${i}`;
    imgDiv.src = imageList[i];
    imgDiv.onerror = () => {
      div.innerHTML = '';
      Util.appendReloadDiv(div, i, loadImages);
    };

    element.appendChild(imgDiv);
  }
}

/**
 * Removes the onclick function from the current page <img>.
 */
async function removeImgLink() {
  const img = document.getElementById('imgCurrent');
  img.id = '';
  img.style = '';
}


// View Modes
// ////////////////////////////////////////////////////////////////

/**
 * Activates the infinite scrolling view mode.
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function infiniteScrolling(viewerDiv) {
  // Find number of pages
  const pageCount = window.wrappedJSObject.lstImages.length;

  loadImages(viewerDiv, 0, pageCount - 1);
}

/**
 * Activates the dual page view mode.
 * @param {object~DOMElement} viewerDiv The DOMElement to append the manga pages to.
 */
async function dualPage(viewerDiv) {
  const pageCount = window.wrappedJSObject.lstImages.length;
  const nextPage = window.wrappedJSObject.currImage + 1;

  if (nextPage >= pageCount) return;

  loadImages(viewerDiv, nextPage, nextPage);
}

// Other
// ////////////////////////////////////////////////////////////////

function displayMenu(data, viewMode) {
  // Check select the reading type
  const readType = document.getElementById('selectReadType');
  if (!readType) return;

  const chapterList = (readType.selectedIndex === 0)
    ? document.getElementById('selectChapter').options
    : document.getElementsByClassName('selectChapter')[0];
  if (!chapterList) return;

  // Parse chapter links
  const curChapterIndex = chapterList.selectedIndex;
  if (curChapterIndex === -1) return;

  const nextChapter = (curChapterIndex < chapterList.length - 1)
    ? `${data.mangaHome}${chapterList[curChapterIndex + 1].value}` : '';
  const previousChapter = (curChapterIndex > 0) ? `${data.mangaHome}${chapterList[curChapterIndex - 1].value}` : '';

  const pageIncrement = (viewMode !== 'dual') ? 1 : 2;

  const nextPage = () => {
    if (pageIncrement === 2) window.wrappedJSObject.currImage += 1;
    window.wrappedJSObject.Next();

    if (pageIncrement === 2) {
      const viewerDiv = document.getElementById('divImage');
      dualPage(viewerDiv);
    }
  };

  const previousPage = () => {
    if (pageIncrement === 2) window.wrappedJSObject.currImage -= 1;
    window.wrappedJSObject.Previous();

    if (pageIncrement === 2) {
      const viewerDiv = document.getElementById('divImage');
      dualPage(viewerDiv);
    }
  };

  const options = {
    source: 'kissmanga',
    reference: data.reference,
    url: {
      current: data.currentUrl,
      home: data.mangaHome,
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

  const data = {
    currentUrl: match[0],
    chapterUrl: match[1],
    mangaHome: match[2],
    reference: match[3],
    currentChapter: match[4],
    currentPage: match[5],
  };

  Util.updateCurrentChapter();

  try {
    const viewMode = await Util.getCurrentViewMode();
    if (!viewMode) throw Error('Could not load view mode');

    const viewerDiv = document.getElementById('divImage');
    viewerDiv.classList.add('fmr-viewer');
    viewerDiv.scrollIntoView({ behavior: 'smooth' });

    switch (viewMode) {
      case 'infinite':
        viewerDiv.innerHTML = '';
        Util.appendScrollTopButton(viewerDiv);
        infiniteScrolling(viewerDiv);
        break;
      case 'dual':
        removeImgLink();
        viewerDiv.classList.add('dual-mode');
        viewerDiv.parentElement.style = '';
        dualPage(viewerDiv);
        break;
      default:
        Util.appendScrollTopButton(viewerDiv);
        break;
    }

    displayMenu(data, viewMode);
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
  }
};
