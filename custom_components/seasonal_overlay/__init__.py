"""Seasonal Overlay: holiday and seasonal decorations over your dashboards.

The integration serves the overlay script and keeps it registered as a
dashboard resource, so there's nothing to add by hand. It also creates the
controls the overlay follows: an on/off switch, theme, mode, density, space
for the header and whether to follow the weather.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv

from .const import CARD_FILE, CARD_URL, DATA_FRONTEND, DOMAIN
from .resources import async_ensure_resource, async_remove_resource, resource_url

PLATFORMS: list[Platform] = [Platform.SWITCH, Platform.SELECT, Platform.NUMBER]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await _async_register_frontend(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # The script stays served until Home Assistant restarts; the controls are unloaded.
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Deleting the integration also removes the overlay from dashboard resources."""
    await async_remove_resource(hass)
    hass.data.pop(DATA_FRONTEND, None)


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """A new weather entity was chosen: reload so the controls report it."""
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve the overlay and make sure dashboards load the current version of it.

    It is added to Settings > Dashboards > Resources (and kept on the current
    version after updates). If that isn't possible, for example with dashboards
    in YAML mode, it is injected into every page instead.
    """
    if hass.data.get(DATA_FRONTEND):
        return
    script = Path(__file__).parent / "frontend" / CARD_FILE
    await hass.http.async_register_static_paths([StaticPathConfig(CARD_URL, str(script), False)])
    if not await async_ensure_resource(hass):
        add_extra_js_url(hass, resource_url())
    hass.data[DATA_FRONTEND] = True
