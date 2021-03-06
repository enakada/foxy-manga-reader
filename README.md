# <img src="static/icons/fmr-color-32.png"> Foxy Manga Reader

[![Mozilla Add-on](https://img.shields.io/amo/stars/foxy-manga-reader.svg?colorB=ff8c00)](https://addons.mozilla.org/en-US/firefox/addon/foxy-manga-reader/)
[![Mozilla Add-on](https://img.shields.io/amo/users/foxy-manga-reader.svg?colorB=ff8c00)](https://addons.mozilla.org/en-US/firefox/addon/foxy-manga-reader/)
[![Discord](https://img.shields.io/discord/418181193104621570.svg?logo=discord&colorB=ff8c00)](https://discord.gg/btqZuFC)


A manga tracker and reader add-on for Mozilla Firefox. Lets you track your manga releases from multiple sources and improves your reading experience. This project was inspired by [A Certain Manga Reader](https://github.com/saishy/certainmangareader).

## Features

- Receive a notification every time a new chapter from your favorite manga is released;
- Backup and Restore your bookmarks;
- Choose how you want to read your manga (infinite scrolling, dual page or single page) and improve your experience;
- Access your bookmarks across different devices.
- Easily manage your bookmarks using the dashboard page.

## Supported Websites

- [Mangafox](http://mangafox.la)
- [MangaEden](http://www.mangaeden.com)
- [MangaHere.cc](http://www.mangahere.cc)
- [Kissmanga](http://kissmanga.com)
- [MangaReader](https://www.mangareader.net)

## Coming Soon

- Support for other sources:
  - MangaPark
  - Mangakakalot
  - Manganelo

## Known Issues

- Foxy is incompatible with any add-on which adds `transform: scale()` property to DOM. ([Issue #2](https://github.com/enakada/foxy-manga-reader/issues/2))
- Firefox's sync storage has a size limit of 200kb for storing add-on data. To prevent Foxy from breaking, the maximum number of manga users can bookmark was limited to 300 manga. In the future another solution will be implemented for those interested in keeping more than 300 manga synced across different devices ([Issue #13](https://github.com/enakada/foxy-manga-reader/issues/13))