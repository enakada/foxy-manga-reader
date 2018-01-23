# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added

- Foxy custom error codes. Every user operation should now return a custom error code, making life easier when debugging for errors.

### Changed

- Raise the minimun Firefox version supported to 53.0 due to `storage.sync` support.
- Improve Foxy's update process. This change can prevent future problems when updating the add-on version.
- MangaHere source identification due to two manga sources having the same name ([mangahere.cc](http://www.mangahere.cc/) and [manga-here.io](https://manga-here.io/)).

### Fixed

- Prevent manga bookmarks from being duplicated due to slow network connections.
- Manga bookmarks not being synced correctly due to how Foxy initialized the `storage.sync`.
- Fix chapter `last read` string appearing besides the trash bin icon in the browser action pop-up after receiving `update-current-chapter` internal message.
- Fix chapter selector updating to invalid index in the browser action pop-up after receiving `update-current-chapter` internal message.

### Removed

- Batoto as a potential source due to Batoto shutting its service down on January, 2018.

## [0.5.0] - 2018-01-14
### Changed

- Replace the XMLHttpRequest API with the newer Fetch API in order to implement connection retry in case of Error 500.
- Modify the options page layout.
- Rename 'backup' and 'restore' to 'export' and 'import'.
- Replace the import (restore) operation with a new selective operation.

### Fixed

- Fix problem in which user was not able to bookmark Manhwa from MangaEden.

## [0.4.0-beta] - 2018-01-09
### Added

- New manga list view mode: list mode. Now it should be easier to track lots of manga.
- New sidebar for add-on control and manga statistics.
- Bootstrap 4 for easier add-on layout.

### Changed

- Replace Icomoon icons with Open Iconic icons.

### Fixed

- Fix problem in which the reload button does not appear if the page fails to load.

## [0.3.1] - 2018-01-04
### Fixed

- Fix browser action notification count not resetting when button is clicked.
- MangaEden: User unable to bookmark manga with special characters in its name.
- Manga cover not being updated.

### Changed

- Improve the response time of the options button in the add-on popup.

## [0.3.0] - 2017-12-25
### Added

- Support for MangaEden
- Support for MangaHere

### Fixed

- Fix view mode option being reset when chapter is selected in browser action popup.
- Fix problem where manga chapters were not being updated if first bookmarked manga had no updates.

## [0.2.0] - 2017-12-18
### Added

- Three new kinds of visualization modes: infinite scrolling, dual page and single page.

## 0.1.0 - 2017-12-15
### Added

- Basic browser action UI based on [A Certain Manga Reader](https://github.com/saishy/certainmangareader) interface.
- Mangafox extractor.
- Unit tests for Mangafox extractor.
- Project icons.
- Settings page with Backup/Restore options.
- License file.

[Unreleased]: https://github.com/enakada/foxy-manga-reader/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.1.0...v0.2.0
[0.3.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.2.0...v0.3.0
[0.3.1]: https://github.com/enakada/foxy-manga-reader/compare/v0.3.0...v0.3.1
[0.4.0-beta]: https://github.com/enakada/foxy-manga-reader/compare/v0.3.1...v0.4.0-beta
[0.5.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.4.0-beta...v0.5.0