import chai from 'chai';
import 'whatwg-fetch';
import * as MockFetch from './mockFetch';
import * as MangaReader from '../src/background_scripts/extractors/mangareader';

const should = chai.should();

describe('mangareader', () => {
  before(() => {
    // Setting DOMParser global to JSDOM
    global.DOMParser = window.DOMParser;
  });

  // Test for #urlRegex
  describe('#urlRegex', () => {
    it('regex should fail for https://www.mangareader.net', () => {
      const result = MangaReader.urlRegex.exec('https://www.mangareader.net');

      should.not.exist(result);
    });

    it('regex should pass for https://www.mangareader.net/tantei-gakuen-q-2', () => {
      const result = MangaReader.urlRegex.exec('https://www.mangareader.net/tantei-gakuen-q-2');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangareader');
      result[2].should.equal('tantei-gakuen-q-2');
    });

    it('regex should pass for https://www.mangareader.net/tantei-gakuen-q-2/5', () => {
      const result = MangaReader.urlRegex.exec('https://www.mangareader.net/tantei-gakuen-q-2/5');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangareader');
      result[2].should.equal('tantei-gakuen-q-2');
    });

    it('regex should pass for https://www.mangareader.net/tantei-gakuen-q-2/50/21', () => {
      const result = MangaReader.urlRegex.exec('https://www.mangareader.net/tantei-gakuen-q-2/50/21');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangareader');
      result[2].should.equal('tantei-gakuen-q-2');
    });
  });

  // Test for #getMangaCover()
  describe('#getMangaCover()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if no id="mangaimg" could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`, 'text/html');

      const fn = () => { MangaReader.getMangaCover(response); };

      (fn).should.throw(Error, /Foxy Error #104/);
    });

    it('should return correct manga cover URL', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head></head>
          <body>
            <div id="mangaimg">
              <img src="https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg"/>
            </div>
          </body>
        </html>`, 'text/html');

      const cover = MangaReader.getMangaCover(response);

      should.exist(cover);
      cover.should.be.equal('https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg');
    });
  });

  // Test for #getMangaStatus()
  describe('#getMangaStatus()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if no id="mangaproperties" could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`, 'text/html');

      const fn = () => { MangaReader.getMangaStatus(response); };

      (fn).should.throw(Error, /Foxy Error #113/);
    });

    it('should return true if status is Completed', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <div id="mangaproperties">
              <table>
                <tr/><tr/><tr/>
                <tr>
                  <td class="propertytitle">Status:</td>
                  <td>Completed</td>
                </tr>
              </table>
            </div>
          </body>
        </html>`, 'text/html');

      const status = MangaReader.getMangaStatus(response);

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
            <div id="mangaproperties">
              <table>
                <tr/><tr/><tr/>
                <tr>
                  <td class="propertytitle">Status:</td>
                  <td>Ongoing</td>
                </tr>
              </table>
            </div>
          </body>
        </html>`, 'text/html');

      const status = MangaReader.getMangaStatus(response);

      should.exist(status);
      status.should.be.equal(false);
    });
  });

  // Test for #getChapterReference()
  describe('#getChapterReference()', () => {
    it('should return defaultValue on https://www.mangareader.net/tantei-gakuen-q', () => {
      const chapter = MangaReader.getChapterReference('https://www.mangareader.net/tantei-gakuen-q', 'default');

      chapter.should.equal('default');
    });

    it('should return { id: 2 } on https://www.mangareader.net/tantei-gakuen-q/2', () => {
      const chapter = MangaReader.getChapterReference('https://www.mangareader.net/tantei-gakuen-q/2', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('2');
    });

    it('should return { id: 30 } on https://www.mangareader.net/tantei-gakuen-q-2/30/4', () => {
      const chapter = MangaReader.getChapterReference('https://www.mangareader.net/tantei-gakuen-q-2/30/4', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('30');
    });

    it('should return { id: 300 } on https://www.mangareader.net/tantei-gakuen-q-2/300/20', () => {
      const chapter = MangaReader.getChapterReference('https://www.mangareader.net/tantei-gakuen-q-2/300/20', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('300');
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
      return MangaReader.getMangaInfo('https://www.mangareader.net/tantei-gakuen-q-2')
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

      return MangaReader.getMangaInfo('https://www.mangareader.net/tantei-gakuen-q-2')
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

      return MangaReader.getMangaInfo('https://www.mangareader.net/tantei-gakuen-q-2')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #300');
          err.params.should.be.equal('https://www.mangareader.net/tantei-gakuen-q-2');
        });
    });

    it('should reject promise if cannot parse url', () => {
      return MangaReader.getMangaInfo('https://www.mangareader.net')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #100');
          err.params.should.be.equal('https://www.mangareader.net');
        });
    });

    it('should reject promise if no title could be retrieved from response body', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      return MangaReader.getMangaInfo('https://www.mangareader.net/tantei-gakuen-q-2')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #102');
          err.params.should.be.equal('https://www.mangareader.net/tantei-gakuen-q-2');
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      const res = `
        <!DOCTYPE html>
        <html>
          <head></head>
          <body>
            <div id="mangaimg"><img src="https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg"/></div>
            <div id="mangaproperties">
              <table>
                <tr>
                  <td class="propertytitle">Name:</td>
                  <td><h2 class="aname">Tantei Gakuen Q 2</h2></td>
                </tr>
                <tr/><tr/>
                <tr>
                  <td class="propertytitle">Status:</td>
                  <td>Completed</td>
                </tr>
              </table>
            </div>
            <div id="chapterlist">
              <table id="listing">
                <tr class="table_head">
                  <th class="leftgap">Chapter Name</th>
                  <th>Date Added</th>
                </tr>
                <tr>
                  <td>
                    <div class="chico_manga"></div>
                    <a href="/tantei-gakuen-q/1">Tantei Gakuen Q 1</a> : Detective School Entrance Exam - Part 1
                  </td>
                  <td>11/02/2009</td>
                </tr>
                <tr>
                  <td>
                    <div class="chico_manga"></div>
                    <a href="/tantei-gakuen-q/1">Tantei Gakuen Q 2</a> : Detective School Entrance Exam - Part 2
                  </td>
                  <td>11/02/2009</td>
                </tr>
              </table>
            </div>
          </body>
        </html>`;

      window.fetch.callsFake(MockFetch.ok(res));

      return MangaReader.getMangaInfo('https://www.mangareader.net/tantei-gakuen-q-2/30/2')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('tantei-gakuen-q-2');
          manga.should.have.property('name').equal('Tantei Gakuen Q 2');
          manga.should.have.property('source').equal('mangareader');
          manga.should.have.property('reference').equal('tantei-gakuen-q-2');
          manga.should.have.property('url').equal('https://www.mangareader.net/tantei-gakuen-q-2');
          manga.should.have.property('cover').equal('https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg');
          manga.should.have.property('status').equal(true);
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
          <head></head>
          <body>
            <div id="mangaimg"><img src="https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg"/></div>
            <div id="mangaproperties">
              <table>
                <tr>
                  <td class="propertytitle">Name:</td>
                  <td><h2 class="aname">Tantei Gakuen Q 2</h2></td>
                </tr>
                <tr/><tr/>
                <tr>
                  <td class="propertytitle">Status:</td>
                  <td>Ongoing</td>
                </tr>
              </table>
            </div>
            <div id="chapterlist">
              <table id="listing">
                <tr class="table_head">
                  <th class="leftgap">Chapter Name</th>
                  <th>Date Added</th>
                </tr>
                <tr>
                  <td>
                    <div class="chico_manga"></div>
                    <a href="/tantei-gakuen-q/1">Tantei Gakuen Q 1</a> : Detective School Entrance Exam - Part 1
                  </td>
                  <td>11/02/2009</td>
                </tr>
                <tr>
                  <td>
                    <div class="chico_manga"></div>
                    <a href="/tantei-gakuen-q/1">Tantei Gakuen Q 2</a> : Detective School Entrance Exam - Part 2
                  </td>
                  <td>11/02/2009</td>
                </tr>
              </table>
            </div>
          </body>
        </html>`;

      window.fetch.callsFake(MockFetch.ok(res));

      return MangaReader.getMangaInfo('https://www.mangareader.net/tantei-gakuen-q-2')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('tantei-gakuen-q-2');
          manga.should.have.property('name').equal('Tantei Gakuen Q 2');
          manga.should.have.property('source').equal('mangareader');
          manga.should.have.property('reference').equal('tantei-gakuen-q-2');
          manga.should.have.property('url').equal('https://www.mangareader.net/tantei-gakuen-q-2');
          manga.should.have.property('cover').equal('https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg');
          manga.should.have.property('status').equal(false);
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
      return MangaReader.updateChapters({ })
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
      const promise = MangaReader.updateChapters({
        sid: 'tantei-gakuen-q-2',
        url: 'https://www.mangareader.net/tantei-gakuen-q-2',
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
      window.fetch.callsFake(MockFetch.ok('no value'));

      const promise = MangaReader.updateChapters({
        sid: 'tantei-gakuen-q-2',
        url: 'https://www.mangareader.net/tantei-gakuen-q-2',
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
      window.fetch.callsFake(MockFetch.ok(`<!DOCTYPE html>
        <html>
          <head></head>
          <body>
            <div id="chapterlist">
              <table id="listing">
                <tr class="table_head">
                  <th class="leftgap">Chapter Name</th>
                  <th>Date Added</th>
                </tr>
                <tr>
                  <td>
                    <div class="chico_manga"></div>
                    <a href="/tantei-gakuen-q/1">Tantei Gakuen Q 1</a> : Detective School Entrance Exam - Part 1
                  </td>
                  <td>11/02/2009</td>
                </tr>
                <tr>
                  <td>
                    <div class="chico_manga"></div>
                    <a href="/tantei-gakuen-q/2">Tantei Gakuen Q 2</a> : Detective School Entrance Exam - Part 2
                  </td>
                  <td>11/02/2009</td>
                </tr>
              </table>
            </div>
          </body>
        </html>`));

      const promise = MangaReader.updateChapters({
        sid: 'tantei-gakuen-q-2',
        url: 'https://www.mangareader.net/tantei-gakuen-q-2',
        chapter_list: [],
      });

      return promise
        .then((data) => {
          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('count').equal(2);
          data.should.have.property('chapterList').with.lengthOf(2);
          data.chapterList.should.deep.include({
            id: '1',
            name: 'Tantei Gakuen Q 1 : Detective School Entrance Exam - Part 1',
            url: 'https://www.mangareader.net/tantei-gakuen-q-2/1',
          });
          data.chapterList.should.deep.include({
            id: '2',
            name: 'Tantei Gakuen Q 2 : Detective School Entrance Exam - Part 2',
            url: 'https://www.mangareader.net/tantei-gakuen-q-2/2',
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
      return MangaReader.updateMetadata({ })
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
      const promise = MangaReader.updateMetadata({
        url: 'https://www.mangareader.net/tantei-gakuen-q-2',
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

      const promise = MangaReader.updateMetadata({
        url: 'https://www.mangareader.net/tantei-gakuen-q-2',
      });

      return promise
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #104');
          err.params.should.have.string('https://www.mangareader.net/tantei-gakuen-q-2');
        });
    });

    it('should resolve to the correct update object', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <div id="mangaimg"><img src="https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg"/></div>
            <div id="mangaproperties">
              <table>
                <tr/><tr/><tr/>
                <tr>
                  <td class="propertytitle">Status:</td>
                  <td>Completed</td>
                </tr>
              </table>
            </div>
          </body>
        </html>`));

      const promise = MangaReader.updateMetadata({
        url: 'https://www.mangareader.net/tantei-gakuen-q-2',
      });

      return promise
        .then((data) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('cover').equal('https://s1.mangareader.net/cover/tantei-gakuen-q/tantei-gakuen-q-l0.jpg');
          data.should.have.property('status').equal(true);
        }).catch((err) => {
          should.not.exist(err);
        });
    });
  });
});
