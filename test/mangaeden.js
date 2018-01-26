import chai from 'chai';
import 'whatwg-fetch';
import * as MockFetch from './mockFetch';
import * as MangaEden from '../src/background_scripts/extractors/mangaeden';

const should = chai.should();

describe('MangaEden', () => {
  before(() => {
    // Setting DOMParser global to JSDOM
    global.DOMParser = window.DOMParser;
  });

  // Test for #urlRegex
  describe('#urlRegex', () => {
    it('regex should fail for http://www.mangaeden.com/eng/', () => {
      const result = MangaEden.urlRegex.exec('http://www.mangaeden.com/eng/');

      should.not.exist(result);
    });

    it('regex should pass for http://www.mangaeden.com/en/en-manga/god-eater---the-2nd-break/', () => {
      const result = MangaEden.urlRegex.exec('http://www.mangaeden.com/en/en-manga/god-eater---the-2nd-break/');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangaeden');
      result[2].should.equal('god-eater---the-2nd-break');
    });

    it('regex should pass for http://www.mangaeden.com/en/en-manga/81/77/1/', () => {
      const result = MangaEden.urlRegex.exec('http://www.mangaeden.com/en/en-manga/81/77/1/');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangaeden');
      result[2].should.equal('81');
    });
  });

  // Test for #getMangaCover()
  describe('#getMangaCover()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if response is not a DOM object', () => {
      (MangaEden.getMangaCover).should.throw(Error, /Foxy Error #300/);
    });

    it('should throw error if no property og:image could be retrieved from response head', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        <html>`, 'text/html');

      const fn = () => { MangaEden.getMangaCover(response); };

      (fn).should.throw(Error, /Foxy Error #104/);
    });

    it('should return correct manga cover URL', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="http://cdn.mangaeden.com/mangasimg/d5/d5d504279e9f99ac5270b098696a203535f55008064142c4fb321405.png" />
            <meta property="og:title" content="Read World's End Harem Manga Online Free in English - Manga Eden" />
          </head>
          <body></body>
        <html>`, 'text/html');

      const cover = MangaEden.getMangaCover(response);

      should.exist(cover);
      cover.should.be.equal('http://cdn.mangaeden.com/mangasimg/d5/d5d504279e9f99ac5270b098696a203535f55008064142c4fb321405.png');
    });
  });

  // Test for #getChapterReference()
  describe('#getChapterReference()', () => {
    it('should return defaultValue on http://www.mangaeden.com/en/en-manga/81/', () => {
      const chapter = MangaEden.getChapterReference('http://www.mangaeden.com/en/en-manga/81/', 'default');

      chapter.should.equal('default');
    });

    it('should return { id: 77 } on http://www.mangaeden.com/en/en-manga/81/77/1/', () => {
      const chapter = MangaEden.getChapterReference('http://www.mangaeden.com/en/en-manga/81/77/1/', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('77');
    });

    it('should return { id: 162 } on http://www.mangaeden.com/en/en-manga/himouto-umaru-chan/162/15/', () => {
      const chapter = MangaEden.getChapterReference('http://www.mangaeden.com/en/en-manga/himouto-umaru-chan/162/15/', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('162');
    });

    it('should return { id: 41.5 } on http://www.mangaeden.com/en/en-manga/himouto-umaru-chan/41.5/1/', () => {
      const chapter = MangaEden.getChapterReference('http://www.mangaeden.com/en/en-manga/himouto-umaru-chan/41.5/1/', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('41.5');
    });
  });

  // Test for #getMangaInfo()
  describe('#getMangaInfo()', () => {
    // Sinon sandbox for Fetch API
    beforeEach(() => {
      MockFetch.init();
    });
    afterEach(() => {
      MockFetch.restore();
    });

    it('should reject promise on invalid URL', () => {
      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(0);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #100');
          err.params.should.be.equal('http://www.mangaeden.com/en/en-manga/');
        });
    });

    it('should reject promise on Error 404', () => {
      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/gantz/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #302');
          err.params.should.have.string('Not Found');
        });
    });

    it('should retry 3 times and reject promise on Error 502', function test() {
      this.timeout(4000);

      window.fetch.callsFake(MockFetch.error('', {
        status: 502,
        statusText: 'Bad Gateway',
      }));

      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/gantz/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(3);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #301');
          err.params.should.have.string('Bad Gateway');
        });
    });

    it('should reject promise if response is empty with no headers', () => {
      window.fetch.callsFake(MockFetch.ok('', { headers: {} }));

      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/gantz/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #300');
          err.params.should.be.equal('http://www.mangaeden.com/en/en-manga/gantz/');
        });
    });

    it('should reject promise if cannot parse url', () => {
      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-directory/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(0);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #100');
          err.params.should.be.equal('http://www.mangaeden.com/en/en-directory/');
        });
    });

    it('should reject promise if no og:title could be retrieved from response body', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/gantz/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #102');
          err.params.should.be.equal('http://www.mangaeden.com/en/en-manga/gantz/');
        });
    });

    it('should return the correct manga object structure for main page', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="http://cdn.mangaeden.com/mangasimg/d5/d5d504279e9f99ac5270b098696a203535f55008064142c4fb321405.png" />
            <meta property="og:title" content="Read World's End Harem Manga Online Free in English - Manga Eden" />
          </head>
          <body>
          <div id="leftContent">
          <table>
            <tbody>
              <tr id="c1" data-id="51c9560345b9ef1874b2aebc">
                <td>
                  <a href="/en/en-manga/fairy-tail/1/1/"><b>1</b></a>
                </td>
              </tr>
              <tr id="c2" data-id="51c95603335b9ef1874b2aebc">
                <td>
                  <a href="/en/en-manga/fairy-tail/2/1/"><b>2</b></a>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          </body>
        <html>`));

      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/fairy-tail/')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('fairy-tail');
          manga.should.have.property('name').equal('World\'s End Harem');
          manga.should.have.property('source').equal('mangaeden');
          manga.should.have.property('reference').equal('fairy-tail');
          manga.should.have.property('url').equal('http://www.mangaeden.com/en/en-manga/fairy-tail/');
          manga.should.have.property('cover').equal('http://cdn.mangaeden.com/mangasimg/d5/d5d504279e9f99ac5270b098696a203535f55008064142c4fb321405.png');
          manga.should.have.property('last_update');
          manga.should.have.property('chapter_list').with.lengthOf(2);
        }).catch((err) => {
          should.not.exist(err);
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="http://cdn.mangaeden.com/mangasimg/5a/5a6d4e822f83c9ccfd54e6b17c8f40ddfa6aa4c422425789744ff8ce.jpg" />
            <meta property="og:image" content="http://cdn.mangaeden.com/mangasimg/58/5834bffd4d615bdc77c7eae56c61ead9577c49d1fef18d429e42b5ff.jpg" />
            <meta property="og:title" content="Read World's End Harem 31.1 Online For Free in English - page 1 - Manga Eden" />
          </head>
          <body>
          <div id="leftContent">
          <table>
            <tbody>
              <tr id="c1" data-id="51c9560345b9ef1874b2aebc">
                <td>
                  <a href="/en/en-manga/air-gear/1/1/"><b>1</b></a>
                </td>
              </tr>
              <tr id="c2.5" data-id="51c95603335b9ef1874b2aebc">
                <td>
                  <a href="/en/en-manga/air-gear/2.5/1/"><b>2</b></a>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          </body>
        <html>`));

      return MangaEden.getMangaInfo('http://www.mangaeden.com/en/en-manga/air-gear/287/1/')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('air-gear');
          manga.should.have.property('name').equal('World\'s End Harem');
          manga.should.have.property('source').equal('mangaeden');
          manga.should.have.property('reference').equal('air-gear');
          manga.should.have.property('url').equal('http://www.mangaeden.com/en/en-manga/air-gear/');
          manga.should.have.property('cover').equal('http://cdn.mangaeden.com/mangasimg/58/5834bffd4d615bdc77c7eae56c61ead9577c49d1fef18d429e42b5ff.jpg');
          manga.should.have.property('last_update');
          manga.should.have.property('chapter_list').with.lengthOf(2);
        }).catch((err) => {
          should.not.exist(err);
        });
    });
  });

  // Test for #updateChapters()
  describe('#updateChapters()', () => {
    // Sinon sandbox for Fetch API
    beforeEach(() => {
      MockFetch.init();
    });
    afterEach(() => {
      MockFetch.restore();
    });

    it('should reject promise if manga object is invalid', () => {
      return MangaEden.updateChapters({ })
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(0);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('updateChapters() argument is invalid');
        });
    });

    it('should reject promise on Error 404', () => {
      const promise = MangaEden.updateChapters({
        sid: 'gantz',
        url: 'http://www.mangaeden.com/en/en-manga/gantz/',
        chapter_list: [],
      });

      return promise
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #302');
          err.params.should.have.string('Not Found');
        });
    });

    it('should return an empty array if no page is returned by found in response object', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      const promise = MangaEden.updateChapters({
        sid: 'gantz',
        url: 'http://www.mangaeden.com/en/en-manga/gantz/',
        chapter_list: [],
      });

      return promise
        .then((data) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('count').equal(0);
          data.should.have.property('chapterList').with.lengthOf(0);
        }).catch((err) => {
          should.not.exist(err);
        });
    });

    it('should return the correct object structure', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head></head>
          <body>
          <div id="leftContent">
          <table>
            <tbody>
              <tr id="c1" data-id="51c9560345b9ef1874b2aebc">
                <td>
                  <a href="/en/en-manga/gantz/1/1/"><b>1</b></a>
                </td>
              </tr>
              <tr id="c2.5" data-id="51c95603335b9ef1874b2aebc">
                <td>
                  <a href="/en/en-manga/gantz/2.5/1/"><b>2.5: Chapter</b></a>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          </body>
        </html>`));

      const promise = MangaEden.updateChapters({
        sid: 'gantz',
        url: 'http://www.mangaeden.com/en/en-manga/gantz/',
        chapter_list: [],
      });

      return promise
        .then((data) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('count').equal(2);
          data.should.have.property('chapterList').with.lengthOf(2);
          data.chapterList.should.deep.include({
            id: '1',
            name: '1',
            url: 'http://www.mangaeden.com/en/en-manga/gantz/1/1/',
          });
          data.chapterList.should.deep.include({
            id: '2.5',
            name: '2.5: Chapter',
            url: 'http://www.mangaeden.com/en/en-manga/gantz/2.5/1/',
          });
        })
        .catch((err) => {
          should.not.exist(err);
        });
    });
  });
});
