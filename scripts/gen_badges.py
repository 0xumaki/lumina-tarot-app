#!/usr/bin/env python3
"""
Lumina — Premium Achievement Badge Generator
Produces 36 self-contained SVG icons (colors baked in via gradients).

Design system per badge:
- 72x72 viewBox
- Embedded <defs> with:
    * linearGradient (3 stops: light -> mid -> dark) — main motif fill
    * radialGradient highlight (top-left, white -> transparent)
    * linearGradient sheen (white low-opacity sliver for top edge)
- Motif silhouette filled with the gradient
- A slightly darker, blurred duplicate behind for depth
- Sparkle accents (small white circles at low opacity)
- A thin outer ring on some badges for the "medal" feel
"""

import os
import math
import json

OUT = "/home/z/my-project/public/badges"
os.makedirs(OUT, exist_ok=True)

# Color families: (light, mid, dark) — baked into each badge
PALETTES = {
    "gold":   ("#FBEFC8", "#D4B27A", "#8A6A2F"),
    "amber":  ("#FFE3B0", "#F09A3D", "#9C4F12"),
    "sage":   ("#E2F0BD", "#A4CC72", "#5A7E2E"),
    "cyan":   ("#C5EEF7", "#5FA9C7", "#1F5470"),
    "violet": ("#E0CFF5", "#9B82D6", "#4D3A85"),
    "rose":   ("#FAD0DD", "#D876A0", "#7E2F50"),
}

def svg(badge_id, palette, body_svg, ring=False, glow=True):
    """Assemble a premium SVG. body_svg is the motif path(s) using fill=URL."""
    light, mid, dark = PALETTES[palette]
    gid_lin = f"g-{badge_id}-lin"
    gid_hl  = f"g-{badge_id}-hl"
    gid_sh  = f"g-{badge_id}-sh"

    ring_svg = ""
    if ring:
        ring_svg = f'''
      <circle cx="36" cy="36" r="33" fill="none" stroke="url(#{gid_lin})" stroke-width="0.8" stroke-opacity="0.5"/>
      <circle cx="36" cy="36" r="30.5" fill="none" stroke="{light}" stroke-width="0.4" stroke-opacity="0.35"/>'''

    glow_svg = ""
    if glow:
        glow_svg = f'''
      <circle cx="36" cy="36" r="28" fill="{mid}" opacity="0.12"/>'''

    # Drop shadow: render a dark, blurred, offset copy of the body
    shadow_body = (body_svg
        .replace(f'url(#{gid_lin})', dark)
        .replace(f'url(#{gid_hl})', 'none')
        .replace(f'url(#{gid_sh})', 'none')
        .replace('url(#g-', 'none__disabled__url(#g-')  # neutralize other grads in shadow
        .replace('none__disabled__url(#g-' + gid_sh + ')', 'none')
    )
    # Simpler: just neutralize url(#g-...-sh) refs inside shadow copy
    shadow_body = body_svg
    for grad_id in [gid_lin, gid_hl, gid_sh]:
        shadow_body = shadow_body.replace(f'url(#{grad_id})', dark)
    # Also neutralize any url(#g-...-sh) for OTHER badges referenced — there shouldn't be any

    return f'''<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="{gid_lin}" x1="14" y1="10" x2="58" y2="62" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="{light}"/>
      <stop offset="55%" stop-color="{mid}"/>
      <stop offset="100%" stop-color="{dark}"/>
    </linearGradient>
    <radialGradient id="{gid_hl}" cx="26" cy="22" r="22" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="{gid_sh}" x1="22" y1="14" x2="50" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>{ring_svg}
  {glow_svg}
  <g opacity="0.5" transform="translate(1.4 2.6)">{shadow_body}</g>
  {body_svg}
  <circle cx="24" cy="20" r="6" fill="url(#{gid_hl})"/>
</svg>
'''

# ---------- Motif bodies ----------

def motif_star5(gid):
    return f'''<path d="M36 10 L42.4 27.2 L60.8 28.2 L46.6 39.6 L51.2 57.4 L36 47.4 L20.8 57.4 L25.4 39.6 L11.2 28.2 L29.6 27.2 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M36 10 L42.4 27.2 L60.8 28.2 L46.6 39.6 L51.2 57.4 L36 47.4 L20.8 57.4 L25.4 39.6 L11.2 28.2 L29.6 27.2 Z" fill="url(#{gid.replace("-lin","-sh")})"/>
  <circle cx="36" cy="34" r="2.5" fill="#FFFFFF" fill-opacity="0.55"/>'''

def motif_fanned_cards(gid):
    return f'''<g transform="translate(36 38)">
    <g transform="rotate(-18)">
      <rect x="-9" y="-22" width="18" height="30" rx="2.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.6"/>
      <rect x="-7" y="-20" width="14" height="3" rx="1" fill="#FFFFFF" fill-opacity="0.35"/>
    </g>
    <g>
      <rect x="-9" y="-22" width="18" height="30" rx="2.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.6"/>
      <rect x="-7" y="-20" width="14" height="3" rx="1" fill="#FFFFFF" fill-opacity="0.5"/>
      <circle cx="0" cy="-6" r="2" fill="#FFFFFF" fill-opacity="0.7"/>
    </g>
    <g transform="rotate(18)">
      <rect x="-9" y="-22" width="18" height="30" rx="2.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.6"/>
      <rect x="-7" y="-20" width="14" height="3" rx="1" fill="#FFFFFF" fill-opacity="0.35"/>
    </g>
  </g>
  <circle cx="20" cy="20" r="1.3" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="54" cy="22" r="1" fill="#FFFFFF" fill-opacity="0.7"/>'''

def motif_flame(gid):
    return f'''<path d="M36 12 C40 18 46 22 46 32 C46 40 41 46 36 46 C31 46 26 40 26 32 C26 22 32 18 36 12 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.6"/>
  <path d="M36 18 C38 22 41 25 41 31 C41 36 38.5 39 36 39 C33.5 39 31 36 31 31 C31 25 34 22 36 18 Z" fill="#FFFFFF" fill-opacity="0.32"/>
  <ellipse cx="33" cy="32" rx="2" ry="4" fill="#FFFFFF" fill-opacity="0.55"/>
  <rect x="33" y="46" width="6" height="14" rx="1" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="0.5"/>
  <line x1="36" y1="46" x2="36" y2="60" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="0.5"/>'''

def motif_check(gid):
    sh = gid.replace("-lin", "-sh")
    return f'''<circle cx="36" cy="36" r="22" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.8"/>
  <circle cx="36" cy="36" r="22" fill="url(#{sh})"/>
  <path d="M25 36.5 L32.5 44 L48 27" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.95"/>
  <path d="M25 36.5 L32.5 44 L48 27" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.6"/>'''

def motif_wave(gid):
    heights = [14, 22, 32, 26, 38, 30, 20, 12, 18, 24, 16, 10]
    n = len(heights)
    x0 = 36 - (n-1)*2.4/2
    bars = []
    for i, h in enumerate(heights):
        x = x0 + i*2.4
        bars.append(f'<rect x="{x-0.9:.1f}" y="{36-h/2:.1f}" width="1.8" height="{h}" rx="0.9" fill="url(#{gid})"/>')
    bars_str = "\n  ".join(bars)
    return f'''{bars_str}
  <circle cx="14" cy="14" r="1.4" fill="#FFFFFF" fill-opacity="0.8"/>
  <circle cx="58" cy="58" r="1.2" fill="#FFFFFF" fill-opacity="0.65"/>'''

def motif_target(gid):
    return f'''<circle cx="36" cy="36" r="22" fill="none" stroke="url(#{gid})" stroke-width="3"/>
  <circle cx="36" cy="36" r="15" fill="none" stroke="url(#{gid})" stroke-width="2.2" stroke-opacity="0.7"/>
  <circle cx="36" cy="36" r="8" fill="url(#{gid})"/>
  <circle cx="36" cy="36" r="3" fill="#FFFFFF" fill-opacity="0.85"/>
  <path d="M36 6 L36 14 M36 58 L36 66 M6 36 L14 36 M58 36 L66 36" stroke="url(#{gid})" stroke-width="2" stroke-linecap="round"/>'''

def motif_sunrise(gid):
    return f'''<path d="M14 44 C14 32 23 24 36 24 C49 24 58 32 58 44" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.6"/>
  <circle cx="36" cy="32" r="9" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5"/>
  <circle cx="33" cy="29" r="3" fill="#FFFFFF" fill-opacity="0.4"/>
  <line x1="10" y1="50" x2="62" y2="50" stroke="url(#{gid})" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="14" y1="55" x2="58" y2="55" stroke="url(#{gid})" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>
  <path d="M36 14 L36 18 M22 18 L24 22 M50 18 L48 22" stroke="url(#{gid})" stroke-width="1.6" stroke-linecap="round"/>'''

def motif_crescent(gid):
    return f'''<path d="M44 14 C34 14 26 22 26 32 C26 42 34 50 44 50 C38 50 32 44 32 36 C32 28 38 22 44 22 C48 22 52 24 55 27 C52 19 48 14 44 14 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.6"/>
  <path d="M40 20 C36 22 33 26 33 32 C33 38 36 42 40 44" fill="#FFFFFF" fill-opacity="0.18"/>
  <path d="M52 50 L53.6 54.5 L58.4 54.7 L54.6 57.6 L56 62 L52 59.3 L48 62 L49.4 57.6 L45.6 54.7 L50.4 54.5 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.4"/>'''

def motif_heart_pulse(gid):
    return f'''<path d="M36 56 C36 56 14 42 14 28 C14 20 20 14 28 14 C32 14 35 16 36 20 C37 16 40 14 44 14 C52 14 58 20 58 28 C58 42 36 56 36 56 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.6"/>
  <path d="M18 32 L26 32 L29 24 L33 40 L36 30 L40 36 L46 32 L54 32" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
  <circle cx="22" cy="22" r="1.2" fill="#FFFFFF" fill-opacity="0.85"/>'''

def motif_three_cards(gid):
    return f'''<g transform="translate(36 38)">
    <g transform="translate(-16 0) rotate(-12)">
      <rect x="-7" y="-18" width="14" height="26" rx="2" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
    </g>
    <g>
      <rect x="-7" y="-18" width="14" height="26" rx="2" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="0.5"/>
      <circle cx="0" cy="-5" r="1.8" fill="#FFFFFF" fill-opacity="0.7"/>
    </g>
    <g transform="translate(16 0) rotate(12)">
      <rect x="-7" y="-18" width="14" height="26" rx="2" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
    </g>
  </g>
  <circle cx="20" cy="20" r="1" fill="#FFFFFF" fill-opacity="0.8"/>'''

def motif_tuning_fork(gid):
    return f'''<g transform="translate(36 36)">
    <rect x="-2" y="-22" width="2" height="14" rx="1" fill="url(#{gid})"/>
    <rect x="0" y="-22" width="2" height="14" rx="1" fill="url(#{gid})"/>
    <path d="M-2 -8 L-2 -4 L-3 0 L-3 14 L3 14 L3 0 L2 -4 L2 -8 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
    <circle cx="0" cy="-22" r="2.6" fill="url(#{gid})"/>
    <path d="M-10 -22 Q-14 -16 -10 -10" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.8" fill="none"/>
    <path d="M10 -22 Q14 -16 10 -10" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.8" fill="none"/>
  </g>
  <ellipse cx="36" cy="52" rx="6" ry="1.4" fill="url(#{gid})" opacity="0.5"/>'''

def motif_lotus(gid):
    return f'''<g transform="translate(36 40)">
    <path d="M0 -20 C4 -14 4 -6 0 0 C-4 -6 -4 -14 0 -20 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.4"/>
    <path d="M-14 -8 C-8 -10 -3 -6 0 0 C-7 -2 -12 -4 -14 -8 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
    <path d="M14 -8 C8 -10 3 -6 0 0 C7 -2 12 -4 14 -8 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
    <path d="M-20 4 C-12 2 -5 2 0 6 C5 2 12 2 20 4 C16 12 8 16 0 16 C-8 16 -16 12 -20 4 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5"/>
    <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" fill-opacity="0.7"/>
  </g>'''

def motif_eye_triangle(gid):
    sh = gid.replace("-lin", "-sh")
    return f'''<path d="M36 10 L62 56 L10 56 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M36 10 L62 56 L10 56 Z" fill="url(#{sh})"/>
  <ellipse cx="36" cy="42" rx="14" ry="8" fill="#0B0B0C" opacity="0.55"/>
  <circle cx="36" cy="42" r="6.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-width="0.6"/>
  <circle cx="36" cy="42" r="3" fill="#0B0B0C"/>
  <circle cx="34" cy="40" r="1.2" fill="#FFFFFF" fill-opacity="0.95"/>
  <path d="M22 26 L26 30 M50 26 L46 30 M36 16 L36 22" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1" stroke-linecap="round"/>'''

def motif_flame_ring(gid):
    return f'''<circle cx="36" cy="36" r="22" fill="none" stroke="url(#{gid})" stroke-width="2.2"/>
  <circle cx="36" cy="36" r="22" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="0.5"/>
  <path d="M36 18 C40 24 44 28 44 36 C44 42 40 46 36 46 C32 46 28 42 28 36 C28 28 32 24 36 18 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
  <path d="M36 24 C38 28 40 30 40 35 C40 39 38 41 36 41 C34 41 32 39 32 35 C32 30 34 28 36 24 Z" fill="#FFFFFF" fill-opacity="0.35"/>
  <ellipse cx="34" cy="34" rx="1.5" ry="3" fill="#FFFFFF" fill-opacity="0.7"/>
  <path d="M36 14 L36 8 M58 36 L64 36 M36 58 L36 64 M14 36 L8 36" stroke="url(#{gid})" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>'''

def motif_wheel(gid):
    spokes = ""
    for i in range(8):
        a = i * math.pi / 4
        x = 36 + 19*math.cos(a)
        y = 36 + 19*math.sin(a)
        spokes += f'<line x1="36" y1="36" x2="{x:.2f}" y2="{y:.2f}" stroke="url(#{gid})" stroke-width="2.2" stroke-linecap="round"/>\n  '
    return f'''<circle cx="36" cy="36" r="22" fill="none" stroke="url(#{gid})" stroke-width="2.4"/>
  <circle cx="36" cy="36" r="17" fill="none" stroke="url(#{gid})" stroke-width="1" stroke-opacity="0.6"/>
  <circle cx="36" cy="36" r="6" fill="url(#{gid})"/>
  <circle cx="36" cy="36" r="2" fill="#FFFFFF" fill-opacity="0.85"/>
  {spokes}'''

def motif_drop(gid):
    return f'''<path d="M36 10 C36 10 22 28 22 42 C22 52 28 60 36 60 C44 60 50 52 50 42 C50 28 36 10 36 10 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.6"/>
  <path d="M30 36 C28 40 28 44 30 48" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.6"/>'''

def motif_yin_yang(gid):
    return f'''<circle cx="36" cy="36" r="22" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.6"/>
  <path d="M36 14 A22 22 0 0 1 36 58 A11 11 0 0 1 36 36 A11 11 0 0 0 36 14 Z" fill="#0B0B0C" opacity="0.85"/>
  <circle cx="36" cy="25" r="3" fill="url(#{gid})"/>
  <circle cx="36" cy="47" r="3" fill="#0B0B0C"/>
  <circle cx="22" cy="20" r="1.2" fill="#FFFFFF" fill-opacity="0.8"/>'''

def motif_question_star(gid):
    return f'''<path d="M36 10 L42.4 27.2 L60.8 28.2 L46.6 39.6 L51.2 57.4 L36 47.4 L20.8 57.4 L25.4 39.6 L11.2 28.2 L29.6 27.2 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M36 22 C32 22 30 25 30 28 C30 32 34 32 34 36 C34 38 32 38 30 38 M30 44 L30 46" stroke="#0B0B0C" stroke-width="2.8" stroke-linecap="round" fill="none"/>
  <circle cx="30" cy="46.5" r="1.6" fill="#0B0B0C"/>'''

# ---- Premium-tier motifs ----

def motif_all_seeing_eye(gid):
    sh = gid.replace("-lin", "-sh")
    return f'''<g transform="translate(36 36)">
    <path d="M-30 0 C-20 -14 20 -14 30 0 C20 14 -20 14 -30 0 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.6"/>
    <path d="M-30 0 C-20 -14 20 -14 30 0 C20 14 -20 14 -30 0 Z" fill="url(#{sh})"/>
    <circle cx="0" cy="0" r="9" fill="#0B0B0C"/>
    <circle cx="0" cy="0" r="6.5" fill="url(#{gid})"/>
    <circle cx="0" cy="0" r="3" fill="#0B0B0C"/>
    <circle cx="-1.5" cy="-1.5" r="1.4" fill="#FFFFFF" fill-opacity="0.95"/>
  </g>
  <path d="M36 6 L36 12 M58 14 L54 18 M62 36 L56 36 M58 58 L54 54 M14 58 L18 54 M10 36 L16 36 M14 14 L18 18" stroke="url(#{gid})" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
  <circle cx="36" cy="36" r="1.5" fill="#FFFFFF" fill-opacity="0.9"/>'''

def motif_sparkle_burst(gid):
    return f'''<path d="M36 8 C38 22 42 26 56 28 C42 30 38 34 36 48 C34 34 30 30 16 28 C30 26 34 22 36 8 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M36 16 C37 23 39 25 46 26 C39 27 37 29 36 36 C35 29 33 27 26 26 C33 25 35 23 36 16 Z" fill="#FFFFFF" fill-opacity="0.35"/>
  <path d="M16 14 L17 18 L21 19 L17 20 L16 24 L15 20 L11 19 L15 18 Z" fill="url(#{gid})" opacity="0.85"/>
  <path d="M56 50 L57 53 L60 54 L57 55 L56 58 L55 55 L52 54 L55 53 Z" fill="url(#{gid})" opacity="0.75"/>
  <circle cx="20" cy="48" r="1.4" fill="#FFFFFF" fill-opacity="0.7"/>
  <circle cx="54" cy="18" r="1" fill="#FFFFFF" fill-opacity="0.6"/>'''

def motif_concentric_waves(gid):
    sh = gid.replace("-lin", "-sh")
    out = f'<circle cx="36" cy="36" r="6" fill="url(#{gid})"/>'
    out += f'<circle cx="36" cy="36" r="6" fill="url(#{sh})"/>'
    for r, op in [(12, 0.85), (18, 0.6), (24, 0.4), (30, 0.22)]:
        out += f'<circle cx="36" cy="36" r="{r}" fill="none" stroke="url(#{gid})" stroke-width="1.8" stroke-opacity="{op}"/>'
    out += f'<circle cx="33" cy="34" r="1.6" fill="#FFFFFF" fill-opacity="0.9"/>'
    return out

def motif_crown(gid):
    sh = gid.replace("-lin", "-sh")
    return f'''<path d="M14 50 L18 26 L28 38 L36 22 L44 38 L54 26 L58 50 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M14 50 L18 26 L28 38 L36 22 L44 38 L54 26 L58 50 Z" fill="url(#{sh})"/>
  <rect x="14" y="48" width="44" height="6" rx="1.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.5"/>
  <circle cx="18" cy="26" r="2" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="36" cy="22" r="2.4" fill="#FFFFFF" fill-opacity="0.9"/>
  <circle cx="54" cy="26" r="2" fill="#FFFFFF" fill-opacity="0.85"/>
  <rect x="32" y="48" width="8" height="6" rx="1" fill="#FFFFFF" fill-opacity="0.35"/>'''

def motif_book(gid):
    return f'''<path d="M12 22 L36 18 L60 22 L60 52 L36 48 L12 52 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M36 18 L36 48" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.8"/>
  <path d="M16 26 L32 23 M16 30 L32 27 M16 34 L32 31 M16 38 L32 35" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.7" stroke-linecap="round"/>
  <path d="M40 23 L56 26 M40 27 L56 30 M40 31 L56 34 M40 35 L56 38" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.7" stroke-linecap="round"/>
  <circle cx="36" cy="33" r="2" fill="#FFFFFF" fill-opacity="0.85"/>
  <path d="M36 12 L37.5 16 L42 17.5 L37.5 19 L36 23 L34.5 19 L30 17.5 L34.5 16 Z" fill="url(#{gid})" opacity="0.85"/>'''

def motif_constellation(gid):
    stars = [(20,20), (30,16), (40,24), (52,18), (48,32), (38,40), (24,38)]
    out = f'<path d="M20 20 L30 16 L40 24 L52 18 M40 24 L48 32 L38 40 L24 38 L20 20" stroke="url(#{gid})" stroke-width="0.8" stroke-opacity="0.45" fill="none"/>'
    for (x, y) in stars:
        out += f'<path d="M{x} {y-3} L{x+0.8} {y-0.8} L{x+3} {y} L{x+0.8} {y+0.8} L{x} {y+3} L{x-0.8} {y+0.8} L{x-3} {y} L{x-0.8} {y-0.8} Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.4"/>'
        out += f'<circle cx="{x}" cy="{y}" r="0.9" fill="#FFFFFF" fill-opacity="0.95"/>'
    return out

def motif_priestess(gid):
    return f'''<rect x="14" y="18" width="5" height="36" rx="1" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
  <rect x="53" y="18" width="5" height="36" rx="1" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
  <circle cx="16.5" cy="18" r="2.2" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.4"/>
  <circle cx="55.5" cy="18" r="2.2" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.4"/>
  <path d="M44 22 C36 22 30 28 30 36 C30 44 36 50 44 50 C38 50 33 44 33 36 C33 28 38 22 44 22 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5"/>
  <path d="M22 26 Q26 32 22 38 Q26 44 22 50" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.7" fill="none"/>
  <path d="M50 26 Q46 32 50 38 Q46 44 50 50" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.7" fill="none"/>
  <circle cx="50" cy="20" r="1" fill="#FFFFFF" fill-opacity="0.85"/>'''

def motif_infinity(gid):
    return f'''<path d="M22 36 C22 28 28 24 34 28 C38 31 36 36 36 36 C36 36 38 41 42 44 C48 48 54 44 54 36 C54 28 48 24 42 28 C38 31 36 36 36 36 C36 36 34 41 30 44 C24 48 18 44 18 36 C18 28 24 24 30 28 C34 31 36 36 36 36" fill="none" stroke="url(#{gid})" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M22 36 C22 28 28 24 34 28 C38 31 36 36 36 36 C36 36 38 41 42 44 C48 48 54 44 54 36 C54 28 48 24 42 28 C38 31 36 36 36 36 C36 36 34 41 30 44 C24 48 18 44 18 36 C18 28 24 24 30 28 C34 31 36 36 36 36" fill="none" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.8" stroke-linecap="round"/>
  <circle cx="22" cy="34" r="1.2" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="50" cy="38" r="1" fill="#FFFFFF" fill-opacity="0.7"/>'''

def motif_star8(gid):
    sh = gid.replace("-lin", "-sh")
    pts = []
    for i in range(16):
        ang = i * math.pi / 8 - math.pi / 2
        r = 22 if i % 2 == 0 else 9
        pts.append(f"{36 + r*math.cos(ang):.2f} {36 + r*math.sin(ang):.2f}")
    poly = " L ".join(pts)
    return f'''<path d="M{poly} Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M{poly} Z" fill="url(#{sh})"/>
  <circle cx="36" cy="36" r="5" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="36" cy="36" r="2" fill="url(#{gid})"/>'''

def motif_laurel(gid):
    leaves = []
    for i in range(7):
        ang_l = math.pi*0.6 + i*math.pi*0.13
        cx_l = 36 - 18*math.cos(ang_l)
        cy_l = 36 + 18*math.sin(ang_l)
        rot_l = (ang_l*180/math.pi) - 90
        leaves.append(f'<ellipse cx="{cx_l:.1f}" cy="{cy_l:.1f}" rx="3" ry="6" transform="rotate({rot_l:.1f} {cx_l:.1f} {cy_l:.1f})" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.3"/>')
        cx_r = 36 + 18*math.cos(ang_l)
        leaves.append(f'<ellipse cx="{cx_r:.1f}" cy="{cy_l:.1f}" rx="3" ry="6" transform="rotate({-rot_l:.1f} {cx_r:.1f} {cy_l:.1f})" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.3"/>')
    leaves_str = "\n  ".join(leaves)
    return f'''{leaves_str}
  <circle cx="36" cy="38" r="6" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5"/>
  <circle cx="36" cy="38" r="2.5" fill="#FFFFFF" fill-opacity="0.85"/>
  <path d="M36 24 L37 28 L41 29 L37 30 L36 34 L35 30 L31 29 L35 28 Z" fill="url(#{gid})" opacity="0.9"/>'''

def motif_sun_face(gid):
    rays = []
    for i in range(12):
        a = i * math.pi / 6
        x1 = 36 + 20*math.cos(a)
        y1 = 36 + 20*math.sin(a)
        x2 = 36 + 27*math.cos(a)
        y2 = 36 + 27*math.sin(a)
        rays.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="url(#{gid})" stroke-width="2" stroke-linecap="round"/>')
    rays_str = "\n  ".join(rays)
    return f'''{rays_str}
  <circle cx="36" cy="36" r="18" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.6"/>
  <circle cx="30" cy="33" r="1.6" fill="#0B0B0C"/>
  <circle cx="42" cy="33" r="1.6" fill="#0B0B0C"/>
  <path d="M28 40 Q36 46 44 40" stroke="#0B0B0C" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="27" cy="38" r="2" fill="#FFFFFF" fill-opacity="0.4"/>
  <circle cx="45" cy="38" r="2" fill="#FFFFFF" fill-opacity="0.4"/>'''

def motif_moon_towers(gid):
    return f'''<rect x="12" y="34" width="9" height="22" rx="0.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
  <rect x="51" y="34" width="9" height="22" rx="0.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.4"/>
  <path d="M12 34 L16.5 28 L21 34 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.4"/>
  <path d="M51 34 L55.5 28 L60 34 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.4"/>
  <path d="M44 18 C36 18 30 24 30 32 C30 40 36 46 44 46 C38 46 33 40 33 32 C33 24 38 18 44 18 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="0.5"/>
  <path d="M36 52 L37 55 L40 55.5 L37 56 L36 59 L35 56 L32 55.5 L35 55 Z" fill="url(#{gid})" opacity="0.85"/>
  <path d="M22 22 L22.7 24.5 L25 25 L22.7 25.5 L22 28 L21.3 25.5 L19 25 L21.3 24.5 Z" fill="#FFFFFF" fill-opacity="0.7"/>'''

def motif_tower_lightning(gid):
    return f'''<path d="M34 12 L42 28 L36 26 L44 44 L32 30 L36 28 L28 12 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.5" stroke-linejoin="round"/>
  <rect x="28" y="40" width="16" height="20" rx="0.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
  <rect x="33" y="46" width="6" height="8" rx="0.5" fill="#0B0B0C" opacity="0.55"/>
  <rect x="30" y="42" width="3" height="3" fill="#FFFFFF" fill-opacity="0.6"/>
  <rect x="39" y="42" width="3" height="3" fill="#FFFFFF" fill-opacity="0.6"/>
  <path d="M28 40 L36 34 L44 40" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.6" fill="none"/>
  <circle cx="36" cy="20" r="1.4" fill="#FFFFFF" fill-opacity="0.9"/>'''

def motif_phoenix(gid):
    return f'''<path d="M36 16 C30 18 24 22 18 28 C24 26 28 26 30 28 C24 32 20 38 18 46 C24 42 28 40 32 40 C30 46 30 52 32 58 C34 52 36 48 36 44 C36 48 38 52 40 58 C42 52 42 46 40 40 C44 40 48 42 54 46 C52 38 48 32 42 28 C44 26 48 26 54 28 C48 22 42 18 36 16 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5" stroke-linejoin="round"/>
  <circle cx="36" cy="28" r="2" fill="#FFFFFF" fill-opacity="0.85"/>
  <path d="M36 14 L37 18 L41 19 L37 20 L36 24 L35 20 L31 19 L35 18 Z" fill="url(#{gid})" opacity="0.9"/>'''

def motif_rose(gid):
    return f'''<circle cx="36" cy="32" r="14" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
  <path d="M36 22 C40 24 42 28 42 32 C42 36 40 40 36 42 C32 40 30 36 30 32 C30 28 32 24 36 22 Z" fill="#FFFFFF" fill-opacity="0.18"/>
  <path d="M36 26 C38 28 39 30 39 32 C39 34 38 36 36 37 C34 36 33 34 33 32 C33 30 34 28 36 26 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.4"/>
  <circle cx="36" cy="32" r="2.5" fill="#FFFFFF" fill-opacity="0.5"/>
  <path d="M28 44 C24 50 22 56 24 60 M44 44 C48 50 50 56 48 60 M36 46 L36 58" stroke="url(#{gid})" stroke-width="1.6" stroke-linecap="round" fill="none"/>
  <path d="M30 52 Q26 54 28 58 M42 52 Q46 54 44 58" stroke="url(#{gid})" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.7"/>'''

def motif_throne(gid):
    return f'''<rect x="22" y="34" width="28" height="24" rx="1" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
  <rect x="22" y="34" width="28" height="6" rx="1" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5"/>
  <rect x="26" y="42" width="20" height="10" rx="0.5" fill="#0B0B0C" opacity="0.4"/>
  <rect x="28" y="44" width="3" height="6" fill="#FFFFFF" fill-opacity="0.4"/>
  <rect x="41" y="44" width="3" height="6" fill="#FFFFFF" fill-opacity="0.4"/>
  <path d="M20 34 L24 30 L48 30 L52 34 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M30 30 L32 22 L34 30 M38 30 L40 22 L42 30 M28 24 L30 18 L32 24 M40 24 L42 18 L44 24" stroke="url(#{gid})" stroke-width="2" stroke-linecap="round" fill="none"/>'''

def motif_lantern(gid):
    return f'''<rect x="28" y="30" width="16" height="22" rx="2" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.6"/>
  <rect x="30" y="32" width="12" height="18" rx="1" fill="#0B0B0C" opacity="0.5"/>
  <circle cx="36" cy="42" r="5" fill="url(#{gid})"/>
  <circle cx="36" cy="42" r="3" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="35" cy="41" r="1" fill="#FFFFFF"/>
  <path d="M28 30 L32 26 L40 26 L44 30 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5" stroke-linejoin="round"/>
  <rect x="33.5" y="22" width="5" height="4" rx="0.5" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.4"/>
  <line x1="36" y1="14" x2="36" y2="22" stroke="url(#{gid})" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="36" cy="14" r="1.4" fill="url(#{gid})"/>
  <path d="M30 56 L42 56" stroke="url(#{gid})" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M22 26 L24 30 M50 26 L48 30 M36 16 L36 18" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.6" stroke-linecap="round"/>'''

def motif_lovers_rings(gid):
    return f'''<circle cx="28" cy="36" r="13" fill="none" stroke="url(#{gid})" stroke-width="3" stroke-opacity="0.95"/>
  <circle cx="44" cy="36" r="13" fill="none" stroke="url(#{gid})" stroke-width="3" stroke-opacity="0.95"/>
  <circle cx="28" cy="36" r="13" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
  <circle cx="44" cy="36" r="13" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.5"/>
  <path d="M22 24 L23 28 L27 29 L23 30 L22 34 L21 30 L17 29 L21 28 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.4"/>
  <path d="M50 38 L51 41 L54 42 L51 43 L50 46 L49 43 L46 42 L49 41 Z" fill="url(#{gid})" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.4"/>
  <circle cx="36" cy="36" r="1.6" fill="#FFFFFF" fill-opacity="0.85"/>'''

# ---------- Registry ----------

BADGES = [
    # Tier 1 — Free (18)
    ("first-card",       "gold",   motif_star5,            False, "Drew your first tarot card"),
    ("card-reader",      "gold",   motif_fanned_cards,     False, "Drew 2+ cards in a day"),
    ("ritual-keeper",    "amber",  motif_flame,            False, "Completed a daily ritual"),
    ("consistent",       "sage",   motif_check,            True,  "Confirmed a goal today"),
    ("resonator",        "cyan",   motif_wave,             False, "Listened to a frequency"),
    ("goal-setter",      "sage",   motif_target,           False, "Set a manifestation goal"),
    ("morning-light",    "amber",  motif_sunrise,          False, "Checked in before 9am"),
    ("moon-child",       "violet", motif_crescent,         False, "Checked in after 9pm"),
    ("mood-tracker",     "rose",   motif_heart_pulse,      False, "Logged 3 moods"),
    ("three-spread",     "gold",   motif_three_cards,      False, "Completed a 3-card spread"),
    ("first-frequency",  "cyan",   motif_tuning_fork,      False, "First frequency session"),
    ("breather",         "sage",   motif_lotus,            False, "Completed a breathing exercise"),
    ("reveal",           "violet", motif_eye_triangle,     False, "Revealed card of the day"),
    ("seven-seeker",     "amber",  motif_flame_ring,       True,  "Reached a 7-day streak"),
    ("wheel-of-time",    "gold",   motif_wheel,            True,  "Used the Wheel of Fortune"),
    ("cleansed",         "cyan",   motif_drop,             False, "Completed the Cleanse ritual"),
    ("balanced",         "violet", motif_yin_yang,         True,  "Completed the Balance ritual"),
    ("asked",            "gold",   motif_question_star,    False, "Completed the Ask ritual"),
    # Tier 2 — Premium (18)
    ("seer",             "violet", motif_all_seeing_eye,   False, "Completed a Celtic Cross reading"),
    ("manifestor",       "sage",   motif_sparkle_burst,    False, "Fulfilled a manifestation goal"),
    ("deep-resonator",   "cyan",   motif_concentric_waves, True,  "10-min frequency session"),
    ("ritual-master",    "gold",   motif_crown,            False, "7-day ritual streak"),
    ("scholar",          "gold",   motif_book,             False, "Saved 5+ reflections"),
    ("mystic",           "violet", motif_constellation,    False, "Tried all 12 frequencies"),
    ("priestess",        "violet", motif_priestess,        False, "Worked with the High Priestess"),
    ("magician",         "gold",   motif_infinity,         False, "Worked with the Magician"),
    ("star-bearer",      "amber",  motif_star8,            False, "Worked with the Star"),
    ("world-walker",     "sage",   motif_laurel,           False, "Worked with the World"),
    ("sun-child",        "amber",  motif_sun_face,         False, "Worked with the Sun"),
    ("moon-walker",      "violet", motif_moon_towers,      False, "Worked with the Moon"),
    ("tower-breaker",    "amber",  motif_tower_lightning,  False, "Worked with the Tower"),
    ("phoenix",          "rose",   motif_phoenix,          False, "Worked with Death (rebirth)"),
    ("empress",          "rose",   motif_rose,             False, "Worked with the Empress"),
    ("emperor",          "gold",   motif_throne,           False, "Worked with the Emperor"),
    ("hermit",           "amber",  motif_lantern,          False, "Worked with the Hermit"),
    ("lovers",           "rose",   motif_lovers_rings,     False, "Worked with the Lovers"),
]

# Friendly display names (override the auto-titled ones for premium feel)
DISPLAY_NAMES = {
    "first-card": "First Card",
    "card-reader": "Card Reader",
    "ritual-keeper": "Ritual Keeper",
    "consistent": "Consistent",
    "resonator": "Resonator",
    "goal-setter": "Goal Setter",
    "morning-light": "Morning Light",
    "moon-child": "Moon Child",
    "mood-tracker": "Mood Keeper",
    "three-spread": "Three Spread",
    "first-frequency": "First Tone",
    "breather": "Breather",
    "reveal": "The Reveal",
    "seven-seeker": "Seven Seeker",
    "wheel-of-time": "Wheel of Time",
    "cleansed": "Cleansed",
    "balanced": "Balanced",
    "asked": "The Ask",
    "seer": "Seer",
    "manifestor": "Manifestor",
    "deep-resonator": "Deep Resonator",
    "ritual-master": "Ritual Master",
    "scholar": "Scholar",
    "mystic": "Mystic",
    "priestess": "Priestess",
    "magician": "Magician",
    "star-bearer": "Star Bearer",
    "world-walker": "World Walker",
    "sun-child": "Sun Child",
    "moon-walker": "Moon Walker",
    "tower-breaker": "Tower Breaker",
    "phoenix": "Phoenix",
    "empress": "Empress",
    "emperor": "Emperor",
    "hermit": "Hermit",
    "lovers": "The Lovers",
}

def render(badge_id, palette, motif_fn, ring):
    gid = f"g-{badge_id}-lin"
    body = motif_fn(gid)
    return svg(badge_id, palette, body, ring=ring)

def main():
    count = 0
    for badge_id, palette, motif_fn, ring, _desc in BADGES:
        content = render(badge_id, palette, motif_fn, ring)
        path = os.path.join(OUT, f"{badge_id}.svg")
        with open(path, "w") as f:
            f.write(content)
        count += 1
    print(f"Generated {count} premium SVG badges in {OUT}")
    manifest = []
    for i, (badge_id, palette, _fn, _ring, desc) in enumerate(BADGES):
        manifest.append({
            "id": badge_id,
            "name": DISPLAY_NAMES.get(badge_id, badge_id.replace("-", " ").title()),
            "svg": f"/badges/{badge_id}.svg",
            "desc": desc,
            "tier": "free" if i < 18 else "premium",
            "color": PALETTES[palette][1],
        })
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote manifest with {len(manifest)} entries")

if __name__ == "__main__":
    main()
