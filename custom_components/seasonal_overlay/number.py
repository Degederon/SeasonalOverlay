"""Numbers: how busy the effects are, and the space left for the header."""

from __future__ import annotations

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DEFAULT_DENSITY, DEFAULT_TOP_INSET
from .entity import SeasonalOverlayEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([DensityNumber(entry), TopInsetNumber(entry)])


class _RestoringNumber(SeasonalOverlayEntity, NumberEntity):
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is None:
            return
        try:
            value = float(last.state)
        except (TypeError, ValueError):
            return
        if self.native_min_value <= value <= self.native_max_value:
            self._attr_native_value = value

    async def async_set_native_value(self, value: float) -> None:
        self._attr_native_value = value
        self.async_write_ha_state()


class DensityNumber(_RestoringNumber):
    """1 is a few flakes, 10 is a blizzard. Borders don't change."""

    _attr_translation_key = "density"
    _attr_icon = "mdi:grain"
    _attr_native_min_value = 0
    _attr_native_max_value = 10
    _attr_native_step = 1
    _attr_mode = NumberMode.SLIDER
    _attr_native_value = DEFAULT_DENSITY

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, "density", "number.seasonal_overlay_density")


class TopInsetNumber(_RestoringNumber):
    """Pixels kept clear at the top so decorations don't cover the header."""

    _attr_translation_key = "top_inset"
    _attr_icon = "mdi:arrow-collapse-down"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 0
    _attr_native_max_value = 160
    _attr_native_step = 2
    _attr_native_unit_of_measurement = "px"
    _attr_mode = NumberMode.BOX
    _attr_native_value = DEFAULT_TOP_INSET

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, "top_inset", "number.seasonal_overlay_top_inset")
