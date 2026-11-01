"""Config flow: a single confirmation step, plus options for the weather entity."""

from __future__ import annotations

from typing import Any

try:  # newer Home Assistant
    import probatio as vol
except ImportError:  # earlier versions
    import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import EntitySelector, EntitySelectorConfig

from .const import CONF_WEATHER_ENTITY, DOMAIN, NAME


class SeasonalOverlayConfigFlow(ConfigFlow, domain=DOMAIN):
    """Single-instance setup."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title=NAME, data={})
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return SeasonalOverlayOptionsFlow()


class SeasonalOverlayOptionsFlow(OptionsFlow):
    """Which weather entity "Follow the weather" listens to."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        current = self.config_entry.options.get(CONF_WEATHER_ENTITY)
        if current is None:
            # Suggest the first weather entity, if there is one.
            current = next(iter(sorted(self.hass.states.async_entity_ids("weather"))), None)
        schema = vol.Schema({vol.Optional(CONF_WEATHER_ENTITY): EntitySelector(EntitySelectorConfig(domain="weather"))})
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(schema, {CONF_WEATHER_ENTITY: current} if current else {}),
        )
