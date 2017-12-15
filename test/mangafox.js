import chai from 'chai';
import sinon from 'sinon';
import * as Mangafox from '../src/background_scripts/extractors/mangafox';

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
    // Mock HttpRequest
    let server;
    before(() => {
      server = sinon.createFakeServer({ respondImmediately: true });
    });
    after(() => {
      server.restore();
    });

    it('should reject promise on Error 404', () => {
      return Mangafox.getMangaInfo('http://mangafox.la/manga/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('string');
          err.should.have.string('Not Found');
        });
    });

    it('should reject promise if response is empty', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, '']); // 200

      return Mangafox.getMangaInfo('http://mangafox.la/manga/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Mangafox response is not a HTML');
        });
    });

    it('should reject promise if cannot parse url', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, '<!DOCTYPE html><html></html>']); // 200

      return Mangafox.getMangaInfo('http://mangafox.la/manga/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Invalid url');
        });
    });

    it('should reject promise if no og:title could be retrieved from response body', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, '<!DOCTYPE html><html></html>']); // 200

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('could not find DOM with property og:title');
        });
    });

    it('should reject promise if no og:image could be retrieved from response body', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Manga Name 1 Page 1" />
          </head>
          <body></body>
        <html>`]);

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/v001/c001/1.html')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('could not find DOM with property og:image');
        });
    });

    it('should reject promise if no cover <img> could be retrieved from response body', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Manga Name 1 Page 1" />
          </head>
          <body></body>
        <html>`]);

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_name/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('could not find <img> DOM with "cover" class');
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      let count = 0;
      server.respondWith((req) => {
        if (count > 0) {
          req.respond(200, { 'Content-Type': 'application/x-javascript' }, `
            ["Title 1","v01/c001"],
            ["Title 2","v01/c002.5"]`);
        } else {
          count += 1;
          req.respond(200, { 'Content-Type': 'text/html' }, `
            <!DOCTYPE html>
            <html>
              <head>
                <meta property="og:image" content="https://lmfcdn.secure.footprint.net/store/manga/5035/cover.jpg" />
                <meta property="og:title" content="Manga Name 1 Page 1" />
              </head>
              <body></body>
            <html>`);
        }
      });

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_manga/v001/c001/1.html')
        .then((manga) => {
          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('5035');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangafox');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://mangafox.la/manga/12_manga/');
          manga.should.have.property('cover').equal('https://lmfcdn.secure.footprint.net/store/manga/5035/cover.jpg');
          manga.should.have.property('last_update');
          manga.should.have.property('chapter_list').with.lengthOf(2);
        }).catch((err) => {
          should.not.exist(err);
        });
    });

    it('should return the correct manga object structure for main page', () => {
      let count = 0;
      server.respondWith((req) => {
        if (count > 0) {
          req.respond(200, { 'Content-Type': 'application/x-javascript' }, `
            ["Title 1","v01/c001"],
            ["Title 2","v01/c002.5"]`);
        } else {
          count += 1;
          req.respond(200, { 'Content-Type': 'text/html' }, `
            <!DOCTYPE html>
            <html>
              <head>
                <meta property="og:image" content="https://lmfcdn.secure.footprint.net/store/manga/5035/cover.jpg" />
                <meta property="og:title" content="Manga Name 1 Page 1" />
              </head>
              <body>
                <div class="cover"><img src="https://lmfcdn.secure.footprint.net/store/manga/5035/cover2.jpg"/></div>
              </body>
            <html>`);
        }
      });

      return Mangafox.getMangaInfo('http://mangafox.la/manga/12_manga/')
        .then((manga) => {
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
    // Mock HttpRequest
    let server;
    before(() => {
      server = sinon.createFakeServer({ respondImmediately: true });
    });
    after(() => {
      server.restore();
    });

    it('should reject promise if manga object is invalid', () => {
      return Mangafox.updateChapters({ })
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Error while retrieving chapter list: Not Found');
        });
    });

    it('should reject promise on Error 404', () => {
      const promise = Mangafox.updateChapters({
        sid: '1',
        url: 'http://mangafox.la/manga/12_manga/',
      });

      return promise
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Error while retrieving chapter list: Not Found');
        });
    });

    it('should return an empty array if no chapters pattern found in response object', () => {
      server.respondWith(''); // 200

      const promise = Mangafox.updateChapters({
        sid: '1',
        url: 'http://mangafox.la/manga/12_manga/',
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
      server.respondWith([200, { 'Content-Type': 'application/x-javascript' }, `
        ["Title 1","v01/c001"],
        ["Title 2","v01/c002.5"]`]);

      const promise = Mangafox.updateChapters({
        sid: '1',
        url: 'http://mangafox.la/manga/12_manga/',
        chapter_list: [],
      });

      return promise
        .then((data) => {
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
