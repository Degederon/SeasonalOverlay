"""Shared base for the overlay's controls."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.restore_state import RestoreEntity

from .const import ATTR_ROLE, DOMAIN, MANUFACTURER, NAME, VERSION


def device_info(entry: ConfigEntry) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name=NAME,
        manufacturer=MANUFACTURER,
        model="Seasonal decorations",
        sw_version=VERSION,
        entry_type=DeviceEntryType.SERVICE,
    )


class SeasonalOverlayEntity(RestoreEntity):
    """A control that remembers its setting across restarts."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, key: str, entity_id: str) -> None:
        self._entry = entry
        self._role = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_device_info = device_info(entry)
        self.entity_id = entity_id

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {ATTR_ROLE: self._role}
