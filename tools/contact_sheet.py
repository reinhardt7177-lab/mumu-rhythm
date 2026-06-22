"""최종 픽셀 에셋을 한 장의 컨택트시트로 모아 미리보기."""
import os
from PIL import Image, ImageDraw

PIX = os.path.join(os.path.dirname(__file__), "..", "assets", "pixel")
ORDER = [
    ("bg-city.png", "city"), ("bg-arena.png", "arena"), ("bg-school.png", "school"),
    ("bg-sunset.png", "sunset"), ("bg-galaxy.png", "galaxy"), ("bg-crowd.png", "crowd(fg)"),
    ("hero.png", "hero/title"), ("fever-aura.png", "fever aura"),
    ("mascot-idol.png", "idol idle"), ("mascot-sing.png", "idol sing"),
    ("mascot-cheer.png", "idol cheer"), ("mascot-miss.png", "idol miss"),
    ("idol-pink.png", "pink idol"), ("idol-dj.png", "dj"),
    ("note-gem.png", "note"), ("star-note.png", "star"), ("hold-note.png", "hold"),
    ("receptor.png", "receptor"), ("hit-burst.png", "burst"), ("ring.png", "perfect ring"),
]
COLS, CW, CH, PAD, LBL = 4, 290, 180, 10, 18
rows = (len(ORDER) + COLS - 1) // COLS
W = COLS * CW
H = rows * (CH + LBL)
sheet = Image.new("RGB", (W, H), (10, 12, 22))
draw = ImageDraw.Draw(sheet)
for i, (fn, label) in enumerate(ORDER):
    p = os.path.join(PIX, fn)
    if not os.path.exists(p):
        continue
    cx, cy = (i % COLS) * CW, (i // COLS) * (CH + LBL)
    im = Image.open(p).convert("RGBA")
    im.thumbnail((CW - 2 * PAD, CH - 2 * PAD), Image.LANCZOS)
    ox = cx + (CW - im.width) // 2
    oy = cy + (CH - im.height) // 2
    sheet.paste(im, (ox, oy), im)
    draw.text((cx + 6, cy + CH + 2), label, fill=(180, 200, 230))
sheet.save(os.path.join(PIX, "_contact_sheet.png"))
print(f"contact sheet {W}x{H}, {len(ORDER)} assets")
