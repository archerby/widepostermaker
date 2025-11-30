# Changelog

All notable changes to Wide Poster Maker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-30

### Added
- Custom license with clear usage terms in About dialog
- Detailed license information visible in Help → About
- Support for 35mm.of.history archival project

### Changed
- Updated to version 1.0.0 (stable release)
- Changed license from MIT to custom free-use license
- Expanded About dialog with scrollable license details
- Updated copyright to Pavel Novikau, upupa.dev

### License Changes
- Free for personal, educational, and commercial use
- Prohibited selling the software (must remain free)
- Prohibited modifications and derivative works
- Commercial inquiries: contact@upupa.dev

## [0.1.1] - 2024-11-30

### Added
- Multi-language support (English, Ukrainian, Belarusian, Polish, Spanish, Portuguese)
- Language switcher in toolbar
- Monochrome finisher for B&W printing
- Comprehensive test coverage for shared math utilities and tiler worker
- Development documentation in `docs/dev/`

### Changed
- Improved UI component structure and styling
- Enhanced export modal with progress tracking
- Refactored state management helpers

### Fixed
- Preview canvas rendering issues
- Export settings persistence

## [0.1.0] - 2024-11-15

### Added
- Initial release
- Cross-platform Electron desktop app (Windows, Linux)
- Live preview canvas with tile boundaries
- Interactive tiling controls (DPI, orientation, margins, overlap)
- Export to PDF, PNG, JPG formats
- Print directly via OS dialog
- Python CLI tool for automation (`image_to_a4_tiles.py`)
- Guides and labeling tools for easier assembly
- Offline-first operation

[1.0.0]: https://github.com/archerby/widepostermaker/compare/v0.1.1...v1.0.0
[0.1.1]: https://github.com/archerby/widepostermaker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/archerby/widepostermaker/releases/tag/v0.1.0
