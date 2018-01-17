import chai from 'chai';
import 'whatwg-fetch';
import * as MockFetch from './mockFetch';
import * as Mangafox from '../src/background_scripts/extractors/mangafox';

// sinonStubPromise(sinon);
const should = chai.should();

describe('Mangafox', () => {
  before(() => {
    // Setting DOMParser global to JSDOM
    global.DOMParser = window.DOMParser;
  });

  // Test for #urlRegex
  describe('#urlRegex', () => {
    it('regex should fail for http://mangafox.la/manga/', () => {
      const result = Mangafox.urlRegex.exec('http://mangafox.la/manga/');

      should.not.exist(result);
    });

    it('regex should pass for http://mangafox.la/manga/12_name/', () => {
      const result = Mangafox.urlRegex.exec('http://mangafox.la/manga/12_name/');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangafox');
      result[2].should.equal('12_name');
    });

    it('regex should pass for https://mangafox.la/manga/12_name/c001/01.html', () => {
      const result = Mangafox.urlRegex.exec('https://mangafox.la/manga/12_name/c001/01.html');

      should.exist(result);
      result.should.have.lengthOf(3);
      result[1].should.equal('mangafox');
      result[2].should.equal('12_name');
    });
  });

  // Test for #getMangaCover()
  describe('#getMangaCover()', () => {
    let parser;
    before(() => {
      parser = new DOMParser();
    });

    it('should throw error if response is not a DOM object', () => {
      (Mangafox.getMangaCover).should.throw(Error, /Foxy Error #300/);
    });

    it('should throw error if no class="cover" could be retrieved from response body', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
          </body>
        <html>`, 'text/html');

      const fn = () => { Mangafox.getMangaCover(response); };

      (fn).should.throw(Error, /Foxy Error #104/);
    });

    it('should return correct manga cover URL', () => {
      const response = parser.parseFromString(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="https://lmfcdn.secure.footprint.net/store/manga/5035/cover.jpg" />
            <meta property="og:title" content="Manga Name 1 Page 1" />
          </head>
          <body>
            <div class="cover"><img src="https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg"/></div>
          </body>
        <html>`, 'text/html');

      const cover = Mangafox.getMangaCover(response);

      should.exist(cover);
      cover.should.be.equal('https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg');
    });
  });

  // Test for #getChapterReference()
  describe('#getChapterReference()', () => {
    it('should return defaultValue on http://mangafox.la/manga/any_name/', () => {
      const chapter = Mangafox.getChapterReference('http://mangafox.la/manga/any_name/', 'default');

      chapter.should.equal('default');
    });

    it('should return { id: v002/c001 } on http://mangafox.la/manga/any_name/v002/c001/1.html', () => {
      const chapter = Mangafox.getChapterReference('http://mangafox.la/manga/any_name/v002/c001/1.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('v002/c001');
    });

    it('should return { id: vTBD/c001 } on http://mangafox.la/manga/any_name/vTBD/c001/1.html', () => {
      const chapter = Mangafox.getChapterReference('http://mangafox.la/manga/any_name/vTBD/c001/1.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('vTBD/c001');
    });

    it('should return { id: c001 } on http://mangafox.la/manga/any_name/c001/1.html', () => {
      const chapter = Mangafox.getChapterReference('http://mangafox.la/manga/any_name/c001/1.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('c001');
    });

    it('should return { id: c001 } on http://mangafox.la/manga/any_name/c001/30.html', () => {
      const chapter = Mangafox.getChapterReference('http://mangafox.la/manga/any_name/c001/1.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('c001');
    });

    it('should return { id: v15/c088.5 } on http://mangafox.la/manga/any_name/v15/c088.5/30.html', () => {
      const chapter = Mangafox.getChapterReference('http://mangafox.la/manga/any_name/v15/c088.5/1.html', 'default');

      chapter.should.be.an('object');
      chapter.should.have.property('id').equal('v15/c088.5');
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
      return Mangafox.getMangaInfo('http://mangafox.la/manga/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(0);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #100');
          err.params.should.be.equal('http://mangafox.la/manga/');
        });
    });

    it('should reject promise on Error 404', () => {
      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
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

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
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

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #300');
          err.params.should.have.string('http://mangafox.la/manga/12_name/');
        });
    });

    it('should reject promise if no og:title could be retrieved from response body', () => {
      window.fetch.callsFake(MockFetch.ok('<!DOCTYPE html><html></html>'));

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #102');
          err.params.should.have.string('http://mangafox.la/manga/12_name/');
        });
    });

    it('should reject promise if no cover <img> could be retrieved from response body', () => {
      window.fetch.callsFake(MockFetch.ok(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Manga Name 1 Page 1" />
          </head>
          <body></body>
        <html>`));

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
        .catch((err) => {
          MockFetch.callCount().should.be.equal(1);

          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Foxy Error #104');
          err.params.should.have.string('http://mangafox.la/manga/12_name/');
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      const res1 = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:image" content="https://lmfcdn.secure.footprint.net/store/manga/5035/cover.jpg" />
            <meta property="og:title" content="Manga Name 1 Page 1" />
          </head>
          <body>
            <div class="cover"><img src="https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg"/></div>
          </body>
        <html>`;
      const res2 = `
        ["Title 1","v01/c001"],
        ["Title 2","v01/c002.5"]`;

      window.fetch
        .onFirstCall().callsFake(MockFetch.ok(res1))
        .onSecondCall().callsFake(MockFetch.ok(res2, { headers: { 'Content-Type': 'application/x-javascript' } }));

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_manga/v001/c001/1.html')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(2);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('5035');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangafox');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://mangafox.la/manga/12_manga/');
          manga.should.have.property('cover').equal('https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg');
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
            <meta property="og:image" content="https://lmfcdn.secure.footprint.net/store/manga/5035/cover.jpg" />
            <meta property="og:title" content="Manga Name 1 Page 1" />
          </head>
          <body>
            <div class="cover"><img src="https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg"/></div>
          </body>
        <html>`;
      const res2 = `
        ["Title 1","v01/c001"],
        ["Title 2","v01/c002.5"]`;

      window.fetch
        .onFirstCall().callsFake(MockFetch.ok(res1))
        .onSecondCall().callsFake(MockFetch.ok(res2, { headers: { 'Content-Type': 'application/x-javascript' } }));

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_manga/')
        .then((manga) => {
          MockFetch.callCount().should.be.equal(2);

          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('5035');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangafox');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://mangafox.la/manga/12_manga/');
          manga.should.have.property('cover').equal('https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg');
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
      return Mangafox.updateChapters({ })
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
      const promise = Mangafox.updateChapters({
        sid: '1',
        url: 'http://mangafox.la/manga/12_manga/',
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
      window.fetch.callsFake(MockFetch.ok('', { headers: { 'Content-Type': 'application/x-javascript' } }));

      const promise = Mangafox.updateChapters({
        sid: '1',
        url: 'http://mangafox.la/manga/12_manga/',
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
        ["Title 1","v01/c001"],
        ["Title 2","v01/c002.5"]`, { headers: { 'Content-Type': 'application/x-javascript' } }));

      const promise = Mangafox.updateChapters({
        sid: '1',
        url: 'http://mangafox.la/manga/12_manga/',
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
            id: 'v01/c001',
            name: 'Title 1',
            url: 'http://mangafox.la/manga/12_manga/v01/c001/1.html',
          });
          data.chapterList.should.deep.include({
            id: 'v01/c002.5',
            name: 'Title 2',
            url: 'http://mangafox.la/manga/12_manga/v01/c002.5/1.html',
          });
        })
        .catch((err) => {
          should.not.exist(err);
        });
    });
  });
});
