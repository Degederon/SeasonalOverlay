# Changelog

## 1.0.0
- First release: seasonal and holiday decorations drawn over your dashboards, as a border, falling effects, or both.
- 11 themes: Winter, Holiday lights, New Year's, Valentine's Day, Spring, Summer (day and night), Fourth of July, Fall, Halloween and Rainy day.
- **Automatic** follows the calendar, with holidays winning over seasons.
- Installs as an **integration**: the overlay loads on every dashboard by itself, with nothing to add under dashboard resources.
- Controls that keep their setting across restarts: on/off, theme, mode, density, space for the header, and Follow the weather.
- Follow the weather: real rain or snow replaces the seasonal theme. Choose the weather entity under the integration's options.
- Turn it off on a single device with `?seasonal_overlay=off`.
- The `custom:seasonal-overlay-card` card for decorating only some views, and a plain script for pages outside Home Assistant.
- Removes an earlier hand-added `seasonal-overlay-card.js` dashboard resource, so the overlay only loads once.
- An app icon for the Marketplace and **Devices & services** (Home Assistant 2026.3 or later).
