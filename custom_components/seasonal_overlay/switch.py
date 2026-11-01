"""Switches: the overlay itself, and whether it follows the weather."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_OFF, STATE_ON, EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import ATTR_WEATHER_ENTITY, CONF_WEATHER_ENTITY
from .entity import SeasonalOverlayEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    async_add_entities([OverlaySwitch(entry), FollowWeatherSwitch(entry)])


class _RestoringSwitch(SeasonalOverlayEntity, SwitchEntity):
    _default = False

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        self._attr_is_on = last.state == STATE_ON if last and last.state in (STATE_ON, STATE_OFF) else self._default

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._attr_is_on = False
        self.async_write_ha_state()


class OverlaySwitch(_RestoringSwitch):
    """Turns the decorations on or off on every dashboard."""

    _attr_name = None  # shown as just "Seasonal Overlay"
    _attr_icon = "mdi:snowflake-variant"
    _default = True

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, "enabled", "switch.seasonal_overlay")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        attrs = super().extra_state_attributes
        weather = self._entry.options.get(CONF_WEATHER_ENTITY)
        if weather:
            attrs[ATTR_WEATHER_ENTITY] = weather
        return attrs


class FollowWeatherSwitch(_RestoringSwitch):
    """When on, rain or snow outside replaces the seasonal theme (holidays stay)."""

    _attr_translation_key = "follow_weather"
    _attr_icon = "mdi:weather-snowy-rainy"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, "weather", "switch.seasonal_overlay_follow_weather")
