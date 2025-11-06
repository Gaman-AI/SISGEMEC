from typing import TypedDict, Optional

class ReportTheme(TypedDict, total=False):
    brand: str
    primary: str
    primary_dark: str
    text: str
    bg: str
    accent: str
    table_header_bg: str
    table_header_fg: str
    row_bg: str
    row_alt_bg: str
    border: str
    font_title: str
    font_body: str
    logo_path: Optional[str]

AOSENUMA_THEME: ReportTheme = {
    "brand": "AOSENUMA",
    "primary": "#208692",
    "primary_dark": "#164F5B",
    "text": "#26272A",
    "bg": "#F4F5F0",
    "accent": "#D4D970",
    "table_header_bg": "#164F5B",
    "table_header_fg": "#FFFFFF",
    "row_bg": "#FFFFFF",
    "row_alt_bg": "#E5EADF",
    "border": "#C7D8D0",
    "font_title": "Inter",
    "font_body": "Inter",
    "logo_path": None,  # opcional por env
}

LEGACY_THEME: ReportTheme = {
    "brand": "SISGEMEC",
    "primary": "#808080",
    "primary_dark": "#606060",
    "text": "#000000",
    "bg": "#FFFFFF",
    "accent": "#CCCCCC",
    "table_header_bg": "#808080",
    "table_header_fg": "#FFFFFF",
    "row_bg": "#F5F5DC",
    "row_alt_bg": "#F0F0F0",
    "border": "#000000",
    "font_title": "Helvetica-Bold",
    "font_body": "Helvetica",
    "logo_path": None,
}

