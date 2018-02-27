import chai from 'chai';
import 'whatwg-fetch';
import * as MockFetch from './mockFetch';
import * as MangaHere from '../src/background_scripts/extractors/mangahere';

const should = chai.should();

describe('MangaHere', () => {
  before(() => {
    // Setting DOMParser global to JSDOM
    global.DOMParser = window.DOMParser;
  });

  // Test for #urlRegex
  describe('#urlRegex', () => {
    it('regex should fail for http://www.mangahere.cc/manga/', () => {
      const result = MangaHere.urlRegex.exec('http://www.mangahere.cc/manga/');

      should.not.exist(result);
    });

    it('regex should pass for http://www.mangahere.cc/manga/12_name/', () => {
      const result = MangaHere.urlRegex.exec('http://www.mangahere.cc/manga/12_name/');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangahere');
      result[2].should.equal('12_name');
    });

    it('regex should pass for http://www.mangahere.cc/manga/12_name/c031/', () => {
      const result = MangaHere.urlRegex.exec('http://www.mangahere.cc/manga/12_name/c031/');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangahere');
      result[2].should.equal('12_name');
    });

    it('regex should pass for http://www.mangahere.cc/manga/12_name/c031/20.html', () => {
      const result = MangaHere.urlRegex.exec('http://www.mangahere.cc/manga/12_name/c031/20.html');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangahere');
      result[2].should.equal('12_name');
    });
  });

  // Test for #getMangaCover()
  describe('#getMangaCover()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if no class="cover" could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`, 'text/html');

      const fn = () => { MangaHere.getMangaCover(response); };

      (fn).should.throw(Error, /Foxy Error #104/);
    });

    it('should return correct manga cover URL', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="http://c.mhcdn.net/store/manga/16143/cover.jpg?v=1513588040" />
            <meta property="og:title" content="Manga Name" />
          </head>
          <body>
            <div class="manga_detail_top clearfix"><img src="https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg"/></div>
          </body>
        </html>`, 'text/html');

      const cover = MangaHere.getMangaCover(response);

      should.exist(cover);
      cover.should.be.equal('https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg');
    });
  });

  // Test for #getMangaStatus()
  describe('#getMangaStatus()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if no "Status:X" could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        </html>`, 'text/html');

      const fn = () => { MangaHere.getMangaStatus(response); };

      (fn).should.throw(Error, /Foxy Error #113/);
    });

    it('should return true if status is Completed', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <ul class="detail_topText">
              <li></li><li></li><li></li>
              <li></li><li></li><li></li>
              <li>Status:Completed</li>
            </ul>
          </body>
        </html>`, 'text/html');

      const status = MangaHere.getMangaStatus(response);

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
            <ul class="detail_topText">
              <li></li><li></li><li></li>
              <li></li><li></li><li></li>
              <li>Status:Ongoing</li>
            </ul>
          </body>
        </html>`, 'text/html');

      const status = MangaHere.getMangaStatus(response);

      should.exist(status);
      status.should.be.equal(false);
    });
  });

  // Test for #getChapterReference()
  describe('#getChapterReference()', () => {
    it('should return defaultValue on http://www.mangahere.cc/manga/12_name/', () => {
      const chapter = MangaHere.getChapterReference('http://www.mangahere.cc/manga/12_name/', 'default');

      chapter.should.equal('default');
    });

    it('should return { id: v002/c001 } on http://www.mangahere.cc/manga/12_name/v002/c001/', () => {
      const chapter = MangaHere.getChapterReference('http://www.mangahere.cc/manga/12_name/v002/c001/', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('v002/c001');
    });

    it('should return { id: c031 } on http://www.mangahere.cc/manga/12_name/c031/', () => {
      const chapter = MangaHere.getChapterReference('http://www.mangahere.cc/manga/12_name/c031/', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('c031');
    });

    it('should return { id: c031 } on http://www.mangahere.cc/manga/12_name/c031/20.html', () => {
      const chapter = MangaHere.getChapterReference('http://www.mangahere.cc/manga/12_name/c031/20.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('c031');
    });

    it('should return { id: c088.5 } on http://www.mangahere.cc/manga/any_name/c088.5/30.html', () => {
      const chapter = MangaHere.getChapterReference('http://www.mangahere.cc/manga/any_name/c088.5/30.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('c088.5');
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
      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
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

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
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

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #300');
          err.params.should.be.equal('http://www.mangahere.cc/manga/12_name/');
        });
    });

    it('should reject promise if cannot parse url', () => {
      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #100');
          err.params.should.be.equal('http://www.mangahere.cc/manga/');
        });
    });

    it('should reject promise if no og:title could be retrieved from response body', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #102');
          err.params.should.be.equal('http://www.mangahere.cc/manga/12_name/');
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      const res1 = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="http://c.mhcdn.net/store/manga/16143/cover.jpg?v=1513588040" />
            <meta property="og:title" content="Manga Name" />
          </head>
          <body>
            <div class="manga_detail_top clearfix"><img src="https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg"/></div>
            <ul class="detail_topText">
              <li></li><li></li><li></li>
              <li></li><li></li><li></li>
              <li>Status:Completed</li>
            </ul>
          </body>
        </html>`;
      const res2 = `
        ["Title 1","//www.mangahere.cc/manga/"+series_name+"/c001/"],
        ["Title 2","//www.mangahere.cc/manga/"+series_name+"/c002.5/"]`;

      window.fetch
        .onFirstCall().callsFake(MockFetch.ok(res1))
        .onSecondCall().callsFake(MockFetch.ok(res2));

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_manga/v001/c001/1.html')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(2);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('16143');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangahere');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://www.mangahere.cc/manga/12_manga/');
          manga.should.have.property('cover').equal('https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg');
          manga.should.have.property('status').equal(true);
          manga.should.have.property('last_update');
          manga.should.have.property('chapter_list').with.lengthOf(2);
        }).catch((err) => {
          should.not.exist(err);
        });
    });

    it('should return the correct manga object structure for main page', () => {
      const res1 = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="http://c.mhcdn.net/store/manga/16143/cover.jpg?v=1513588040" />
            <meta property="og:title" content="Manga Name" />
          </head>
          <body>
            <div class="manga_detail_top clearfix"><img src="https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg"/></div>
            <ul class="detail_topText">
              <li></li><li></li><li></li>
              <li></li><li></li><li></li>
              <li>Status:Ongoing</li>
            </ul>
          </body>
        </html>`;
      const res2 = `
        ["Title 1","//www.mangahere.cc/manga/"+series_name+"/c001/"],
        ["Title 2","//www.mangahere.cc/manga/"+series_name+"/c002.5/"]`;

      window.fetch
        .onFirstCall().callsFake(MockFetch.ok(res1))
        .onSecondCall().callsFake(MockFetch.ok(res2));

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_manga/')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(2);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('16143');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangahere');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://www.mangahere.cc/manga/12_manga/');
          manga.should.have.property('cover').equal('https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg');
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
      return MangaHere.updateChapters({ })
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
      const promise = MangaHere.updateChapters({
        sid: '1',
        url: 'http://www.mangahere.cc/manga/12_manga/',
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

      const promise = MangaHere.updateChapters({
        sid: '1',
        url: 'http://www.mangahere.cc/manga/12_manga/',
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
        ["Title 1","//www.mangahere.cc/manga/"+series_name+"/c001/"],
        ["Title 2","//www.mangahere.cc/manga/"+series_name+"/c002.5/"]`));

      const promise = MangaHere.updateChapters({
        sid: '1',
        url: 'http://www.mangahere.cc/manga/12_manga/',
        chapter_list: [],
      });

      return promise
        .then((data) => {
          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('count').equal(2);
          data.should.have.property('chapterList').with.lengthOf(2);
          data.chapterList.should.deep.include({
            id: 'c001',
            name: 'Title 1',
            url: 'http://www.mangahere.cc/manga/12_manga/c001/',
          });
          data.chapterList.should.deep.include({
            id: 'c002.5',
            name: 'Title 2',
            url: 'http://www.mangahere.cc/manga/12_manga/c002.5/',
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
      return MangaHere.updateMetadata({ })
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
      const promise = MangaHere.updateMetadata({
        url: 'http://www.mangahere.cc/manga/12_manga/',
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

      const promise = MangaHere.updateMetadata({
        url: 'http://www.mangahere.cc/manga/12_manga/',
      });

      return promise
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #104');
          err.params.should.have.string('http://www.mangahere.cc/manga/12_manga/');
        });
    });

    it('should resolve to the correct update object', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <div class="manga_detail_top clearfix"><img src="https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg"/></div>
            <ul class="detail_topText">
              <li></li><li></li><li></li>
              <li></li><li></li><li></li>
              <li>Status:Completed</li>
            </ul>
          </body>
        </html>`));

      const promise = MangaHere.updateMetadata({
        url: 'http://www.mangahere.cc/manga/12_manga/',
      });

      return promise
        .then((data) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(data);
          data.should.be.an('object');
          data.should.have.property('cover').equal('https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg');
          data.should.have.property('status').equal(true);
        }).catch((err) => {
          should.not.exist(err);
        });
    });
  });
});
