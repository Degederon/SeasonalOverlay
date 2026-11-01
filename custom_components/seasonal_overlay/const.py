"""Constants for the Seasonal Overlay integration."""

from __future__ import annotations

DOMAIN = "seasonal_overlay"
NAME = "Seasonal Overlay"
VERSION = "1.1.0"
MANUFACTURER = "Degederon"

CARD_FILE = "seasonal-overlay.js"
CARD_URL = f"/{DOMAIN}/{CARD_FILE}"
# Earlier hand-installed copies that should be replaced by this integration's file.
OLD_CARD_FILES = (CARD_FILE, "seasonal-overlay-card.js")
DATA_FRONTEND = f"{DOMAIN}_frontend_registered"

CONF_WEATHER_ENTITY = "weather_entity"

# Every entity carries this attribute so the overlay script can find its
# controls even if the entity IDs are renamed.
ATTR_ROLE = "overlay_role"
ATTR_WEATHER_ENTITY = "weather_entity"

THEMES = [
    "auto",
    "winter",
    "holiday",
    "newyear",
    "valentine",
    "spring",
    "summer",
    "july4",
    "fall",
    "halloween",
    "rain",
    "off",
]
MODES = ["both", "border", "falling"]

DEFAULT_THEME = "auto"
DEFAULT_MODE = "both"
DEFAULT_DENSITY = 5
DEFAULT_TOP_INSET = 56
