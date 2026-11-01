"""Keep the overlay script registered as a dashboard resource and pointing at the current version."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

from .const import CARD_URL, OLD_CARD_FILES, VERSION

_LOGGER = logging.getLogger(__name__)

LOVELACE_DOMAIN = "lovelace"


def resource_url() -> str:
    """The address dashboards load, with the version so browsers fetch new releases."""
    return f"{CARD_URL}?v={VERSION}"


def _path(item: dict[str, Any]) -> str:
    return str(item.get("url", "")).split("?", 1)[0]


def _resource_collection(hass: HomeAssistant) -> Any | None:
    """Return the dashboard resource collection, if it can be edited."""
    lovelace = hass.data.get(LOVELACE_DOMAIN)
    if lovelace is None:
        return None
    resources = getattr(lovelace, "resources", None)
    if resources is None and isinstance(lovelace, dict):
        resources = lovelace.get("resources")
    # Dashboards in YAML mode have a read-only collection without create/update.
    if resources is None or not hasattr(resources, "async_create_item"):
        return None
    return resources


async def async_ensure_resource(hass: HomeAssistant) -> bool:
    """Add or update the card's resource. Returns False when it must be added by hand.

    Older copies (a manual copy in /local, such as the first seasonal-overlay-card.js)
    are removed, so the overlay is only loaded once and always from this integration.
    """
    resources = _resource_collection(hass)
    if resources is None:
        return False

    wanted = resource_url()
    try:
        if hasattr(resources, "async_get_info"):
            await resources.async_get_info()  # loads stored resources if needed
        items = list(resources.async_items())
        ours = [item for item in items if _path(item) == CARD_URL]
        older = [
            item
            for item in items
            if _path(item) != CARD_URL and any(_path(item).endswith("/" + name) for name in OLD_CARD_FILES)
        ]

        for item in older:
            await resources.async_delete_item(item["id"])
            _LOGGER.info("Removed older Seasonal Overlay resource %s", item.get("url"))

        if not ours:
            await resources.async_create_item({"res_type": "module", "url": wanted})
            _LOGGER.info("Added dashboard resource %s", wanted)
            return True

        first, *duplicates = ours
        if first.get("url") != wanted or first.get("type", "module") != "module":
            await resources.async_update_item(first["id"], {"res_type": "module", "url": wanted})
            _LOGGER.info("Updated dashboard resource to %s", wanted)
        for item in duplicates:
            await resources.async_delete_item(item["id"])
        return True
    except Exception:  # noqa: BLE001 - never block setup over a resource problem
        _LOGGER.warning(
            "Could not register the Seasonal Overlay dashboard resource automatically; "
            "add %s as a JavaScript module under Settings > Dashboards > Resources",
            wanted,
            exc_info=True,
        )
        return False


async def async_remove_resource(hass: HomeAssistant) -> None:
    """Remove the overlay's resource when the integration is deleted."""
    resources = _resource_collection(hass)
    if resources is None:
        return
    try:
        if hasattr(resources, "async_get_info"):
            await resources.async_get_info()
        for item in list(resources.async_items()):
            if _path(item) == CARD_URL:
                await resources.async_delete_item(item["id"])
    except Exception:  # noqa: BLE001 - removal is best effort
        _LOGGER.debug("Could not remove the Seasonal Overlay dashboard resource", exc_info=True)
