# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.5] - 2018-09-07
### Added

- `Refresh Database` button in the Dashboard page. This button forces the database to update its data (could be used to manually check for new chapter updates).

### Fixed

- Kissmanga error #302 and #500 when adding new manga. This was due to proxying when resolving the Cloudflare challenge.
- Database disappears after Firefox 62.0 update. Firefox changed Foxy's ID which broke the persistent database. Changed the logic when updating chapter list to fix that.

## [0.7.4] - 2018-07-09
### Added

- Simple Foxy tutorial for new users. Explains how to start tracking manga using Foxy.
- New ordering feature. Users can order their list by latest updates.

### Fixed

- Kissmanga url regex validation which was failing due to special characters like `%`. This was a complementary fix to what was applied in Issue #16. (Issue #17)

## [0.7.3] - 2018-06-09
### Fixed

- MangaHere updates. Request was being cached by the browser, preventing chapter updates. (Issue #15)

## [0.7.2] - 2018-06-07
### Fixed

- Warning being triggered due to invalid badge color.
- Kissmanga url regex which was failing due to special characters like `%`. (Issue #16)

## [0.7.1] - 2018-05-12
### Added

- New source: [MangaReader](https://www.mangareader.net).

### Changed

- Prevent cache during manga background updates.

### Fixed

- Kissmanga background updates. The updates were not working due to a change to the cloudflare code.
- Changed how chapters are retrieved from Fanfox source. Fanfox is slowly removing the auxiliar javascript file with the chapter list and that change was breaking Foxy.

## [0.6.2] - 2018-03-12
### Added

- Option for choosing which storage to store the bookmarks. (For now either `Local` or `Sync`).

### Changed

- Decrease maximum manga list size from 300 entries to 280 in order to have more leeway in adding more add-on configuration in the future.
This only affects users using the sync storage.
- Moved `LocalForage` storage to `FoxyStorage`.

### Fixed

- Content script was not loading sidebar menu on kissmanga pages due to a change to the DOM structure when 'All pages' mode was selected.

## [0.6.1] - 2018-02-27
### Added

- Manga progress to Dashboard page.
- Source information to browser action pop-up.
- Limit manga list size to 300 entries ([Issue #13](https://github.com/enakada/foxy-manga-reader/issues/13)).
- Manga status (`Completed` or `Ongoing`) to Dashboard page.
- Show database consistency warning in Dashboard page.
- AMA and Discord shields to `README.md`.

### Fixed

- MangaHere's chapter parser ignoring the volume string (e.g., `v01/c50` returning only `c50`).

## [0.6.0] - 2018-02-12
### Added

- Cloudscrapper, a piece of code that solves challenges from Cloudflare in order to access pages protected by their service.
- Support for kissmanga.com.
- Dashboard page. Users can now manage their bookmarks easily using bulk actions.

### Changed

- Notification's error icon. Old icon replaced by the Open Iconic equivalent.
- Update Bootstrap to version 4.0.0.
- Prevent Foxy from checking manga URL when unbookmarking entries from the pop-up.
- Moved Export/Import features from add-on options to Foxy's dashboard.

### Fixed

- When Foxy was updated or installed with no previous bookmarks, an undefined variable was being accessed.
- Sometimes, when receiving a sync notification, it came with no newValue to modify, leading to an undefined variable being accessed.
- Foxy was unable to sync its data if a large number of manga were bookmarked.

## [0.5.2] - 2018-01-29
### Changed

- Mangafox domain from `http://mangafox.la` to `http://fanfox.net`.
- Mangafox source name to `fanfox`. This only affects the database.
- Export file version is now the same as the add-on version. This makes it easier to perform database migrations.

### Fixed

- Fix chapter selector updating to wrong index in the browser action pop-up after receiving `update-current-chapter` internal message.
- Fix browser action pop-up not updating the chapter information after receiving `update-current-chapter` or `update-chapter-list` internal messages. This only affects the List View Mode.

## [0.5.1] - 2018-01-24
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

[Unreleased]: https://github.com/enakada/foxy-manga-reader/compare/v0.7.5...HEAD
[0.2.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.1.0...v0.2.0
[0.3.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.2.0...v0.3.0
[0.3.1]: https://github.com/enakada/foxy-manga-reader/compare/v0.3.0...v0.3.1
[0.4.0-beta]: https://github.com/enakada/foxy-manga-reader/compare/v0.3.1...v0.4.0-beta
[0.5.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.4.0-beta...v0.5.0
[0.5.1]: https://github.com/enakada/foxy-manga-reader/compare/v0.5.0...v0.5.1
[0.5.2]: https://github.com/enakada/foxy-manga-reader/compare/v0.5.1...v0.5.2
[0.6.0]: https://github.com/enakada/foxy-manga-reader/compare/v0.5.2...v0.6.0
[0.6.1]: https://github.com/enakada/foxy-manga-reader/compare/v0.6.0...v0.6.1
[0.6.2]: https://github.com/enakada/foxy-manga-reader/compare/v0.6.1...v0.6.2
[0.7.1]: https://github.com/enakada/foxy-manga-reader/compare/v0.6.2...v0.7.1
[0.7.2]: https://github.com/enakada/foxy-manga-reader/compare/v0.7.1...v0.7.2
[0.7.3]: https://github.com/enakada/foxy-manga-reader/compare/v0.7.2...v0.7.3
[0.7.4]: https://github.com/enakada/foxy-manga-reader/compare/v0.7.3...v0.7.4
[0.7.5]: https://github.com/enakada/foxy-manga-reader/compare/v0.7.4...v0.7.5