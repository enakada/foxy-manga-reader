import chai from 'chai';
import 'whatwg-fetch';
import * as MockFetch from './mockFetch';
import * as KissManga from '../src/background_scripts/extractors/kissmanga';

const should = chai.should();

describe('KissManga', () => {
  before(() => {
    // Setting DOMParser global to JSDOM
    global.DOMParser = window.DOMParser;
  });

  // Test for #urlRegex
  describe('#urlRegex', () => {
    it('regex should fail for http://kissmanga.com/Manga/', () => {
      const result = KissManga.urlRegex.exec('http://kissmanga.com/Manga/');

      should.not.exist(result);
    });

    it('regex should pass for http://kissmanga.com/Manga/Suki-to-Ienai', () => {
      const result = KissManga.urlRegex.exec('http://kissmanga.com/Manga/Suki-to-Ienai');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('kissmanga');
      result[2].should.equal('Suki-to-Ienai');
    });

    it('regex should pass for http://kissmanga.com/Manga/I-Can-t-Sleep-Alone/4?id=73380', () => {
      const result = KissManga.urlRegex.exec('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone/4?id=73380');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('kissmanga');
      result[2].should.equal('I-Can-t-Sleep-Alone');
    });
  });

  // Test for #getMangaCover()
  describe('#getMangaCover()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if no <link rel="image_src" /> could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`, 'text/html');

      const fn = () => { KissManga.getMangaCover(response); };

      (fn).should.throw(Error, /Foxy Error #104/);
    });

    it('should return correct manga cover URL', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
            <link rel="image_src" href="http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg" />
          </head>
          <body>
            <div><img src="http://kissmanga.com/Uploads/Etc/10-11-2011/1.jpg"/></div>
          </body>
        </html>`, 'text/html');

      const cover = KissManga.getMangaCover(response);

      should.exist(cover);
      cover.should.be.equal('http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg');
    });
  });

  // Test for #getMangaStatus()
  describe('#getMangaStatus()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if no "Status: X" could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`, 'text/html');

      const fn = () => { KissManga.getMangaStatus(response); };

      (fn).should.throw(Error, /Foxy Error #113/);
    });

    it('should return true if status is Completed', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <div id="leftside">
              <div>
                <div class="barContent">
                  <div></div>
                  <div>Status: Completed</div>
                </div>
              </div>
            </div>
          </body>
        </html>`, 'text/html');

      const status = KissManga.getMangaStatus(response);

      should.exist(status);
      status.should.be.equal(true);
    });

    it('should return false if status is Ongoing', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <div id="leftside">
              <div>
                <div class="barContent">
                  <div></div>
                  <div>Status: Ongoing</div>
                </div>
              </div>
            </div>
          </body>
        </html>`, 'text/html');

      const status = KissManga.getMangaStatus(response);

      should.exist(status);
      status.should.be.equal(false);
    });
  });

  // Test for #getChapterReference()
  describe('#getChapterReference()', () => {
    it('should return defaultValue on http://kissmanga.com/Manga/Suki-to-Ienai', () => {
      const chapter = KissManga.getChapterReference('http://kissmanga.com/Manga/Suki-to-Ienai', 'default');

      chapter.should.equal('default');
    });

    it('should return { id: 882---a?id=387884 } on http://kissmanga.com/Manga/One-Piece/882---a?id=387884', () => {
      const chapter = KissManga.getChapterReference('http://kissmanga.com/Manga/One-Piece/882---a?id=387884', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('882---a?id=387884');
    });

    it('should return { id: One---782-005?id=320499 } on http://kissmanga.com/Manga/One-Piece/One---782-005?id=320499', () => {
      const chapter = KissManga.getChapterReference('http://kissmanga.com/Manga/One-Piece/One---782-005?id=320499', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('One---782-005?id=320499');
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

    it('should reject promise on Error 404', () => {
      return KissManga.getMangaInfo('http://kissmanga.com/Manga/One-Piece')
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

      return KissManga.getMangaInfo('http://kissmanga.com/Manga/One-Piece/')
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

      return KissManga.getMangaInfo('http://kissmanga.com/Manga/One-Piece')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #300');
          err.params.should.be.equal('http://kissmanga.com/Manga/One-Piece');
        });
    });

    it('should reject promise if cannot parse url', () => {
      return KissManga.getMangaInfo('http://kissmanga.com/Manga')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #100');
          err.params.should.be.equal('http://kissmanga.com/Manga');
        });
    });

    it('should reject promise if no <meta name="description"/> could be retrieved from response body', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      return KissManga.getMangaInfo('http://kissmanga.com/Manga/One-Piece')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #102');
          err.params.should.be.equal('http://kissmanga.com/Manga/One-Piece');
        });
    });

    it('should reject promise on cover error', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="description" content="Read I Can&#39;t Sleep Alone manga online free and high quality." />
          </head>
          <body>
          <div id="leftside">
          </div>
          </body>
        </html>`));

      const promise = KissManga.updateMetadata({
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
      });

      return promise
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #104');
          err.params.should.have.string('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone');
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      const res = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="description" content="Read I Can&#39;t Sleep Alone manga online free and high quality." />
            <link rel="image_src" href="http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg" />
          </head>
          <body>
          <div id="leftside">
            <div class="barContent">
              <div></div>
              <div>Status: Ongoing</div>
            </div>
            <table>
            <tr>
              <td><a href="/Manga/One-Piece/One-Piece---410?id=319813">One Piece 410</a></td>
            </tr>
            <tr>
              <td><a href="/Manga/One-Piece/One-Piece---782-005?id=320499">One Piece 782.005</a></td>
            </tr>
            </table>
          </div>
          </body>
        </html>`;

      window.fetch
        .withArgs('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone').callsFake(MockFetch.ok(res));

      return KissManga.getMangaInfo('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone/3?id=73373#1')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('I-Can-t-Sleep-Alone');
          manga.should.have.property('name').equal('I Can\'t Sleep Alone');
          manga.should.have.property('source').equal('kissmanga');
          manga.should.have.property('reference').equal('I-Can-t-Sleep-Alone');
          manga.should.have.property('url').equal('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone');
          manga.should.have.property('cover').equal('http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg');
          manga.should.have.property('status').equal(false);
          manga.should.have.property('last_update');
          manga.should.have.property('chapter_list').with.lengthOf(2);
        }).catch((err) => {
          should.not.exist(err);
        });
    });

    it('should return the correct manga object structure for main page', () => {
      const res = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="description" content="Read I Can&#39;t Sleep Alone manga online free and high quality." />
            <link rel="image_src" href="http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg" />
          </head>
          <body>
          <div id="leftside">
            <div class="barContent">
              <div></div>
              <div>Status: Completed</div>
            </div>
            <table>
            <tr>
              <td><a href="/Manga/One-Piece/One-Piece---410?id=319813">One Piece 410</a></td>
            </tr>
            <tr>
              <td><a href="/Manga/One-Piece/One-Piece---782-005?id=320499">One Piece 782.005</a></td>
            </tr>
            </table>
          </div>
          </body>
        </html>`;

      window.fetch
        .withArgs('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone').callsFake(MockFetch.ok(res));

      return KissManga.getMangaInfo('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone/')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('I-Can-t-Sleep-Alone');
          manga.should.have.property('name').equal('I Can\'t Sleep Alone');
          manga.should.have.property('source').equal('kissmanga');
          manga.should.have.property('reference').equal('I-Can-t-Sleep-Alone');
          manga.should.have.property('url').equal('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone');
          manga.should.have.property('cover').equal('http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg');
          manga.should.have.property('status').equal(true);
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
      return KissManga.updateChapters({ })
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
      const promise = KissManga.updateChapters({
        sid: 'I-Can-t-Sleep-Alone',
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
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

    it('should return an empty array if no chapters pattern found in response object', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      const promise = KissManga.updateChapters({
        sid: 'I-Can-t-Sleep-Alone',
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
        chapter_list: [],
      });

      return promise
        .then((data) => {
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
          <div id="leftside">
          <table>
            <tbody>
              <tr>
                <td>
                  <a href="/Manga/One-Piece/One-Piece---410?id=319813">One Piece 410</a>
                </td>
              </tr>
              <tr>
                <td>
                  <a href="/Manga/One-Piece/One-Piece---782-005?id=320499">One Piece 782.005</a>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          </body>
        </html>`));

      const promise = KissManga.updateChapters({
        sid: 'I-Can-t-Sleep-Alone',
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
        chapter_list: [],
      });

      return promise
        .then((data) => {
          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('count').equal(2);
          data.should.have.property('chapterList').with.lengthOf(2);
          data.chapterList.should.deep.include({
            id: 'One-Piece---410?id=319813',
            name: 'One Piece 410',
            url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone/One-Piece---410?id=319813',
          });
          data.chapterList.should.deep.include({
            id: 'One-Piece---782-005?id=320499',
            name: 'One Piece 782.005',
            url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone/One-Piece---782-005?id=320499',
          });
        })
        .catch((err) => {
          should.not.exist(err);
        });
    });
  });

  // Test for #updateMetadata()
  describe('#updateMetadata()', () => {
    // Sinon sandbox for Fetch API
    beforeEach(() => {
      MockFetch.init();
    });
    afterEach(() => {
      MockFetch.restore();
    });

    it('should reject promise if manga object is invalid', () => {
      return KissManga.updateMetadata({ })
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(0);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('updateMetadata() argument is invalid');
        });
    });

    it('should reject promise on Error 404', () => {
      const promise = KissManga.updateMetadata({
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
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

    it('should reject promise on cover error', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`));

      const promise = KissManga.updateMetadata({
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
      });

      return promise
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #104');
          err.params.should.have.string('http://kissmanga.com/Manga/I-Can-t-Sleep-Alone');
        });
    });

    it('should resolve to the correct update object', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
            <link rel="image_src" href="http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg" />
          </head>
          <body>
            <div id="leftside">
              <div class="barContent">
                <div></div>
                <div>Status: Completed</div>
              </div>
            </div>
          </body>
        </html>`));

      const promise = KissManga.updateMetadata({
        url: 'http://kissmanga.com/Manga/I-Can-t-Sleep-Alone',
      });

      return promise
        .then((data) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('cover').equal('http://kissmanga.com/Uploads/Etc/10-11-2011/6554082i76520.jpg');
          data.should.have.property('status').equal(true);
        }).catch((err) => {
          should.not.exist(err);
        });
    });
  });
});
