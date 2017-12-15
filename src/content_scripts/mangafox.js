// Try updating chapter on background
async function updateChapter() {
  try {
    await browser.runtime.sendMessage({
      type: 'update-chapter',
      manga_url: window.location.href,
    });
  } catch (err) {
    console.error(`Error while updating current chapter: ${err}`); // eslint-disable-line no-console
  }
}

updateChapter();
