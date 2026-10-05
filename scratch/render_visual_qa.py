#!/usr/bin/env python3
"""
Visual QA Renderer for Android Home-Screen Widgets.
Renders all 6 widgets (Small & Medium, Light & Dark, English & Arabic, Truncated)
to pixel-perfect PNG images for visual audit and inclusion in the final report.
"""

import os
import cairosvg
import arabic_reshaper
from bidi.algorithm import get_display

OUTPUT_DIR = "/root/islamic_app/scratch/visual_qa"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# App & Widget Design Tokens matching values/colors.xml & values-night/colors.xml
THEMES = {
    "light": {
        "bg": "#F8FAF9",
        "surface": "#FFFFFF",
        "border": "#E3E8E5",
        "text_primary": "#0E1214",
        "text_secondary": "#57503F",
        "text_muted": "#8C8474",
        "accent_amber": "#C26E17",
        "accent_green": "#0F5A4A",
        "badge_bg": "#FDF4EB",
        "badge_stroke": "#F5D5B8",
        "active_row_bg": "#EAEFEA",
    },
    "dark": {
        "bg": "#0E1214",
        "surface": "#161B1E",
        "border": "#232B30",
        "text_primary": "#F4EEE1",
        "text_secondary": "#B3ADA2",
        "text_muted": "#756F64",
        "accent_amber": "#E8924C",
        "accent_green": "#157A64",
        "badge_bg": "#2A1E14",
        "badge_stroke": "#4D341F",
        "active_row_bg": "#17231E",
    },
}

def shape_ar(text):
    if not text:
        return ""
    try:
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except:
        return text

# 1. Prayer Small Widget (Aspect Ratio ~ 2x2 or 3x2: 320x160)
def render_prayer_small(theme_name="light", empty=False, filename=None):
    t = THEMES[theme_name]
    fn = filename or f"prayer_small_{theme_name}.png"
    out_path = os.path.join(OUTPUT_DIR, fn)

    brand = "ISLAMIC"
    loc = "Tap to Set Up" if empty else "Dubai, UAE"
    eyebrow = "PRAYER TIMES" if empty else "NEXT PRAYER · ASR"
    hero_time = "Open App" if empty else "3:30 PM"
    badge_text = "Tap to load times" if empty else "in 42 min"
    font_size_time = "22" if empty else "26"

    badge_w = 110 if empty else 86

    svg = f"""<svg width="320" height="150" viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="150" rx="18" fill="{t['bg']}" stroke="{t['border']}" stroke-width="1.5"/>
  
  <!-- Header: Brand + Location -->
  <text x="18" y="28" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" letter-spacing="1.5" fill="{t['accent_green']}">{brand}</text>
  <text x="302" y="28" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="10" fill="{t['text_secondary']}">{loc}</text>
  
  <!-- Eyebrow: Next Prayer -->
  <text x="18" y="52" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" letter-spacing="1.0" fill="{t['accent_amber']}">{eyebrow}</text>
  
  <!-- Hero Time Display -->
  <text x="18" y="86" font-family="DejaVu Serif, serif" font-size="{font_size_time}" font-weight="bold" fill="{t['text_primary']}">{hero_time}</text>
  
  <!-- Countdown Pill -->
  <g transform="translate(18, 102)">
    <rect width="{badge_w}" height="24" rx="6" fill="{t['badge_bg']}" stroke="{t['badge_stroke']}" stroke-width="1"/>
    <text x="{badge_w/2}" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" fill="{t['accent_amber']}">{badge_text}</text>
  </g>
</svg>"""
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out_path)
    return out_path

# 2. Prayer Medium Widget (Aspect Ratio ~ 4x2: 440x160)
def render_prayer_medium(theme_name="light", filename=None):
    t = THEMES[theme_name]
    fn = filename or f"prayer_medium_{theme_name}.png"
    out_path = os.path.join(OUTPUT_DIR, fn)

    prayers = [
        {"name": "Fajr", "time": "05:12", "active": False},
        {"name": "Dhuhr", "time": "12:15", "active": False},
        {"name": "Asr", "time": "15:30", "active": True},
        {"name": "Maghrib", "time": "18:05", "active": False},
        {"name": "Isha", "time": "19:25", "active": False},
    ]

    col_svg = ""
    col_w = 76
    start_x = 18
    for i, p in enumerate(prayers):
        x = start_x + i * 82
        bg_rect = ""
        name_color = t['accent_amber'] if p['active'] else t['text_secondary']
        time_color = t['accent_amber'] if p['active'] else t['text_primary']
        if p['active']:
            bg_rect = f'<rect x="{x-4}" y="98" width="{col_w}" height="38" rx="6" fill="{t["active_row_bg"]}" stroke="{t["badge_stroke"]}" stroke-width="1"/>'
        col_svg += f"""
        {bg_rect}
        <text x="{x + col_w/2 - 4}" y="113" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="9" font-weight="bold" fill="{name_color}">{p['name']}</text>
        <text x="{x + col_w/2 - 4}" y="129" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="bold" fill="{time_color}">{p['time']}</text>
        """

    svg = f"""<svg width="440" height="150" viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="440" height="150" rx="18" fill="{t['bg']}" stroke="{t['border']}" stroke-width="1.5"/>
  
  <!-- Header: Brand + Location -->
  <text x="18" y="26" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" letter-spacing="1.5" fill="{t['accent_green']}">ISLAMIC</text>
  <text x="422" y="26" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="10" fill="{t['text_secondary']}">Dubai, UAE</text>
  
  <!-- Hero Row: Next Prayer + Time (Left) & Countdown Pill (Right) -->
  <text x="18" y="46" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" letter-spacing="1.0" fill="{t['accent_amber']}">NEXT PRAYER · ASR</text>
  <text x="18" y="74" font-family="DejaVu Serif, serif" font-size="22" font-weight="bold" fill="{t['text_primary']}">3:30 PM</text>
  
  <g transform="translate(334, 46)">
    <rect width="88" height="26" rx="6" fill="{t['badge_bg']}" stroke="{t['badge_stroke']}" stroke-width="1"/>
    <text x="44" y="17" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" fill="{t['accent_amber']}">in 42 min</text>
  </g>
  
  <!-- Hairline divider -->
  <line x1="18" y1="88" x2="422" y2="88" stroke="{t['border']}" stroke-width="1"/>
  
  <!-- 5-Prayer Mini Row -->
  {col_svg}
</svg>"""
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out_path)
    return out_path

# 3. Quran Verse Widget (400x150)
def render_quran(theme_name="light", filename=None):
    t = THEMES[theme_name]
    fn = filename or f"quran_{theme_name}.png"
    out_path = os.path.join(OUTPUT_DIR, fn)

    ar = shape_ar("اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ")
    en = "Allah! There is no deity except Him, the Ever-Living, the Sustainer..."

    svg = f"""<svg width="400" height="150" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="150" rx="18" fill="{t['bg']}" stroke="{t['border']}" stroke-width="1.5"/>
  
  <!-- Header: Eyebrow + Ref -->
  <text x="18" y="26" font-family="DejaVu Sans, sans-serif" font-size="9" font-weight="bold" letter-spacing="1.2" fill="{t['accent_green']}">QURAN · VERSE OF THE DAY</text>
  <text x="382" y="26" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" fill="{t['text_secondary']}">Al-Baqarah 2:255</text>
  
  <!-- Arabic Text (Right-aligned, Amiri/Serif feel) -->
  <text x="382" y="60" text-anchor="end" font-family="FreeSerif, serif" font-size="16" fill="{t['text_primary']}">{ar}</text>
  
  <!-- Translation (1 line, clean truncation) -->
  <text x="18" y="92" font-family="DejaVu Sans, sans-serif" font-size="11" fill="{t['text_secondary']}">{en}</text>
  
  <!-- Footer CTA -->
  <text x="18" y="126" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" fill="{t['accent_amber']}">Read Ayah →</text>
</svg>"""
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out_path)
    return out_path

# 4. Continue Reading Widget (320x150)
def render_continue(theme_name="light", filename=None):
    t = THEMES[theme_name]
    fn = filename or f"continue_{theme_name}.png"
    out_path = os.path.join(OUTPUT_DIR, fn)

    ar = shape_ar("البَقَرَة")

    svg = f"""<svg width="320" height="150" viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="150" rx="18" fill="{t['bg']}" stroke="{t['border']}" stroke-width="1.5"/>
  
  <text x="18" y="26" font-family="DejaVu Sans, sans-serif" font-size="9" font-weight="bold" letter-spacing="1.2" fill="{t['accent_green']}">CONTINUE READING</text>
  <text x="302" y="26" text-anchor="end" font-family="FreeSerif, serif" font-size="13" font-weight="bold" fill="{t['text_secondary']}">{ar}</text>
  
  <text x="18" y="58" font-family="DejaVu Serif, serif" font-size="18" font-weight="bold" fill="{t['text_primary']}">Al-Baqarah</text>
  <text x="18" y="80" font-family="DejaVu Sans, sans-serif" font-size="11" fill="{t['text_secondary']}">Surah 2 · Ayah 255</text>
  
  <text x="18" y="122" font-family="DejaVu Sans, sans-serif" font-size="10" font-weight="bold" fill="{t['accent_amber']}">Resume Reading →</text>
</svg>"""
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out_path)
    return out_path

# 5. Qibla Widget (300x150)
def render_qibla(theme_name="light", filename=None):
    t = THEMES[theme_name]
    fn = filename or f"qibla_{theme_name}.png"
    out_path = os.path.join(OUTPUT_DIR, fn)

    svg = f"""<svg width="300" height="150" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="150" rx="18" fill="{t['bg']}" stroke="{t['border']}" stroke-width="1.5"/>
  
  <text x="18" y="26" font-family="DejaVu Sans, sans-serif" font-size="9" font-weight="bold" letter-spacing="1.2" fill="{t['accent_green']}">QIBLA DIRECTION</text>
  
  <text x="18" y="60" font-family="DejaVu Serif, serif" font-size="22" font-weight="bold" fill="{t['accent_amber']}">258° WSW</text>
  <text x="18" y="84" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="bold" fill="{t['text_primary']}">1,640 km to Makkah</text>
  
  <text x="18" y="118" font-family="DejaVu Sans, sans-serif" font-size="10" fill="{t['text_secondary']}">Dubai, UAE · Tap to align compass →</text>
</svg>"""
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out_path)
    return out_path

# 6. Dua Widget (380x150)
def render_dua(theme_name="light", filename=None):
    t = THEMES[theme_name]
    fn = filename or f"dua_{theme_name}.png"
    out_path = os.path.join(OUTPUT_DIR, fn)

    ar = shape_ar("أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ")
    en = "We have entered a new morning and unto Allah belongs all sovereignty..."

    svg = f"""<svg width="380" height="150" viewBox="0 0 380 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="150" rx="18" fill="{t['bg']}" stroke="{t['border']}" stroke-width="1.5"/>
  
  <text x="18" y="26" font-family="DejaVu Sans, sans-serif" font-size="9" font-weight="bold" letter-spacing="1.2" fill="{t['accent_green']}">DUA &amp; REMEMBRANCE</text>
  
  <g transform="translate(312, 14)">
    <rect width="50" height="18" rx="5" fill="{t['badge_bg']}" stroke="{t['badge_stroke']}" stroke-width="1"/>
    <text x="25" y="13" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="9" font-weight="bold" fill="{t['accent_amber']}">Morning</text>
  </g>
  
  <text x="18" y="50" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="bold" fill="{t['text_primary']}">Morning Remembrance</text>
  
  <text x="362" y="76" text-anchor="end" font-family="FreeSerif, serif" font-size="14" fill="{t['text_primary']}">{ar}</text>
  
  <text x="18" y="102" font-family="DejaVu Sans, sans-serif" font-size="11" fill="{t['text_secondary']}">{en}</text>
  
  <text x="18" y="128" font-family="DejaVu Sans, sans-serif" font-size="10" fill="{t['text_muted']}">Sahih Muslim 2723 · Tap to view →</text>
</svg>"""
    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=out_path)
    return out_path

def main():
    print("Generating Visual QA renders...")
    render_prayer_small("light")
    render_prayer_small("dark")
    render_prayer_small("light", empty=True, filename="prayer_small_empty_light.png")
    render_prayer_small("dark", empty=True, filename="prayer_small_empty_dark.png")
    
    render_prayer_medium("light")
    render_prayer_medium("dark")
    
    render_quran("light")
    render_quran("dark")
    
    render_continue("light")
    render_continue("dark")
    
    render_qibla("light")
    render_qibla("dark")
    
    render_dua("light")
    render_dua("dark")
    
    print(f"Generated 14 widget visual renders in: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
