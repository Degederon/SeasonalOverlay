"""Selects: which theme, and what to draw."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DEFAULT_MODE, DEFAULT_THEME, MODES, THEMES
from .entity import SeasonalOverlayEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities(
        [
            OverlaySelect(entry, "theme", "select.seasonal_overlay_theme", THEMES, DEFAULT_THEME, "mdi:palette"),
            OverlaySelect(entry, "mode", "select.seasonal_overlay_mode", MODES, DEFAULT_MODE, "mdi:image-filter-frames"),
        ]
    )


class OverlaySelect(SeasonalOverlayEntity, SelectEntity):
    """A list of choices that remembers the last one picked."""

    def __init__(
        self, entry: ConfigEntry, key: str, entity_id: str, options: list[str], default: str, icon: str
    ) -> None:
        super().__init__(entry, key, entity_id)
        self._attr_translation_key = key
        self._attr_options = options
        self._attr_current_option = default
        self._attr_icon = icon

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last and last.state in self.options:
            self._attr_current_option = last.state

    async def async_select_option(self, option: str) -> None:
        self._attr_current_option = option
        self.async_write_ha_state()
