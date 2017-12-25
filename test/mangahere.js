import chai from 'chai';
import sinon from 'sinon';
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

  // Test for #getChapterReference()
  describe('#getChapterReference()', () => {
    it('should return defaultValue on http://www.mangahere.cc/manga/12_name/', () => {
      const chapter = MangaHere.getChapterReference('http://www.mangahere.cc/manga/12_name/', 'default');

      chapter.should.equal('default');
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
    // Mock HttpRequest
    let server;
    before(() => {
      server = sinon.createFakeServer({ respondImmediately: true });
    });
    after(() => {
      server.restore();
    });

    it('should reject promise on Error 404', () => {
      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('string');
          err.should.have.string('Not Found');
        });
    });

    it('should reject promise if response is empty', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, '']); // 200

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('MangaHere response is not a HTML');
        });
    });

    it('should reject promise if cannot parse url', () => {
      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Invalid url');
        });
    });

    it('should reject promise if no og:title could be retrieved from response body', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, '<!DOCTYPE html><html></html>']); // 200

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('could not find DOM with property og:title');
        });
    });

    it('should reject promise if no cover <img> could be retrieved from response body', () => {
      server.respondWith([200, { 'Content-Type': 'text/html' }, `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Manga Name" />
          </head>
          <body></body>
        <html>`]);

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_name/')
        .catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('could not find <img> DOM with "manga_detail_top" class');
        });
    });

    it('should return the correct manga object structure for chapter page', () => {
      let count = 0;
      server.respondWith((req) => {
        if (count > 0) {
          req.respond(200, { 'Content-Type': 'text/html' }, `
            ["Title 1","//www.mangahere.cc/manga/"+series_name+"/c001/"],
            ["Title 2","//www.mangahere.cc/manga/"+series_name+"/c002.5/"]`);
        } else {
          count += 1;
          req.respond(200, { 'Content-Type': 'text/html' }, `
            <!DOCTYPE html>
            <html>
              <head>
                <meta property="og:image" content="http://c.mhcdn.net/store/manga/16143/cover.jpg?v=1513588040" />
                <meta property="og:title" content="Manga Name" />
              </head>
              <body>
              <div class="manga_detail_top clearfix"><img src="https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg"/></div>
              </body>
            <html>`);
        }
      });

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_manga/v001/c001/1.html')
        .then((manga) => {
          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('16143');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangahere');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://www.mangahere.cc/manga/12_manga/');
          manga.should.have.property('cover').equal('https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg');
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
          req.respond(200, { 'Content-Type': 'text/html' }, `
            ["Title 1","//www.mangahere.cc/manga/"+series_name+"/c001/"],
            ["Title 2","//www.mangahere.cc/manga/"+series_name+"/c002.5/"]`);
        } else {
          count += 1;
          req.respond(200, { 'Content-Type': 'text/html' }, `
            <!DOCTYPE html>
            <html>
              <head>
                <meta property="og:image" content="http://c.mhcdn.net/store/manga/16143/cover.jpg?v=1513588040" />
                <meta property="og:title" content="Manga Name" />
              </head>
              <body>
                <div class="manga_detail_top clearfix"><img src="https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg"/></div>
              </body>
            <html>`);
        }
      });

      return MangaHere.getMangaInfo('http://www.mangahere.cc/manga/12_manga/')
        .then((manga) => {
          should.exist(manga);
          manga.should.be.an('object');
          manga.should.have.property('sid').equal('16143');
          manga.should.have.property('name').equal('Manga Name');
          manga.should.have.property('source').equal('mangahere');
          manga.should.have.property('reference').equal('12_manga');
          manga.should.have.property('url').equal('http://www.mangahere.cc/manga/12_manga/');
          manga.should.have.property('cover').equal('https://mhcdn.secure.footprint.net/store/manga/16143/cover.jpg');
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
      return MangaHere.updateChapters({ })
        .then((data) => {
          should.not.exist(data);
        }).catch((err) => {
          should.exist(err);
          err.should.be.an('error');
          err.message.should.have.string('Error while retrieving chapter list: Not Found');
        });
    });

    it('should reject promise on Error 404', () => {
      const promise = MangaHere.updateChapters({
        sid: '1',
        url: 'http://www.mangahere.cc/manga/12_manga/',
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
      server.respondWith([200, { 'Content-Type': 'text/html' }, 'no value']); // 200

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
      server.respondWith([200, { 'Content-Type': 'text/html' }, `
        ["Title 1","//www.mangahere.cc/manga/"+series_name+"/c001/"],
        ["Title 2","//www.mangahere.cc/manga/"+series_name+"/c002.5/"]`]);

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
});
