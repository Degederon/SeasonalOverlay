# Changelog

## 1.2.0
- Move the mouse into a corner and the decorations there fade away, so the sidebar menu and other buttons underneath are easy to see. They come back when the mouse leaves. A soft clear spot also follows the mouse anywhere on screen. Touch screens are unaffected. Turn it off on a card with `hover_fade: false`.
- Troubleshooting now explains how to turn animations back on when only the border shows.

## 1.1.0
- German, Spanish and French: the setup screens, options, controls and theme names now follow your Home Assistant language.
- The card's label in edit mode is translated too.

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
