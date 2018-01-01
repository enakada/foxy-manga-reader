# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed

- Fix browser action notification count not reseting when button is clicked.
- MangaEden: Fix problem where user was unable to bookmark manga with special characters in its name.

## [0.3.0] - 2017-12-25
### Added

- Support for MangaEden
- Support for MangaHere

### Fix

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