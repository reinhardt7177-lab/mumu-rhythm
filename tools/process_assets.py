"""
MUMU 픽셀 에셋 후처리: 크로마키(마젠타/그린) → 자동 크롭 → 리사이즈.
힉스필드 생성 원본(*-raw.*)을 받아 게임용 최종 PNG로 변환한다. 재실행 가능(없는 파일은 건너뜀).

사용: python tools/process_assets.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
PIX = os.path.join(ROOT, "assets", "pixel")


def chroma_key(img: Image.Image, key: str) -> Image.Image:
    """순수 마젠타/그린 배경을 알파로 제거 + 가벼운 디스필(테두리 색 번짐 완화)."""
    arr = np.array(img.convert("RGBA")).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    a = arr[..., 3]
    if key == "magenta":
        bg = (r > 110) & (b > 110) & (r - g > 50) & (b - g > 50)
        # 디스필: 남는 픽셀의 과한 마젠타 끼 완화
        keep = ~bg
        over = keep & (r - g > 25) & (b - g > 25)
        cap = g + 25
        r[over] = np.minimum(r[over], cap[over])
        b[over] = np.minimum(b[over], cap[over])
    elif key == "green":
        bg = (g > 90) & (g - r > 45) & (g - b > 45)
        keep = ~bg
        over = keep & (g - r > 25) & (g - b > 25)
        cap = np.maximum(r, b) + 20
        g[over] = np.minimum(g[over], cap[over])
    else:
        return img.convert("RGBA")
    a[bg] = 0
    arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3] = r, g, b, a
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def autocrop(img: Image.Image, pad: int = 6) -> Image.Image:
    """알파 바운딩박스로 투명 여백 제거 + 약간의 패딩."""
    a = np.array(img)[..., 3]
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return img
    x0, x1 = max(0, xs.min() - pad), min(img.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(img.height, ys.max() + 1 + pad)
    return img.crop((x0, y0, x1, y1))


def fit_square(img: Image.Image, size: int) -> Image.Image:
    """투명 정사각 캔버스 중앙에 배치 후 size로 축소."""
    s = max(img.width, img.height)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(img, ((s - img.width) // 2, (s - img.height) // 2), img)
    return canvas.resize((size, size), Image.LANCZOS)


def fit_dim(img: Image.Image, dim: str, px: int) -> Image.Image:
    if dim == "width":
        h = round(img.height * px / img.width)
        return img.resize((px, h), Image.LANCZOS)
    h = round(img.width * px / img.height)
    return img.resize((h, px), Image.LANCZOS)


# (원본, 최종, 키, 핏) — 핏: ("square",N) / ("width",N) / ("height",N)
MANIFEST = [
    ("note-gem-raw.png",  "note-gem.png",   "magenta", ("square", 256)),
    ("hit-burst-raw.png", "hit-burst.png",  "magenta", ("square", 256)),
    ("mascot-raw.png",    "mascot-idol.png", "green",   ("height", 560)),
    ("bg-crowd-raw.jpg",  "bg-crowd.png",   "green",   ("width", 1280)),
    ("bg-city-raw.png",   "bg-city.png",    None,      ("width", 1280)),
    # 배경 추가분 (있을 때만 처리)
    ("bg-arena-raw.png",   "bg-arena.png",   None, ("width", 1280)),
    ("bg-school-raw.png",  "bg-school.png",  None, ("width", 1280)),
    ("bg-sunset-raw.png",  "bg-sunset.png",  None, ("width", 1280)),
    ("bg-galaxy-raw.png",  "bg-galaxy.png",  None, ("width", 1280)),
    # 마스코트 포즈 / 추가 캐릭터
    ("mascot-sing-raw.png",  "mascot-sing.png",  "green", ("height", 560)),
    ("mascot-cheer-raw.png", "mascot-cheer.png", "green", ("height", 560)),
    ("mascot-miss-raw.png",  "mascot-miss.png",  "green", ("height", 560)),
    ("idol-pink-raw.png",    "idol-pink.png",    "green", ("height", 560)),
    ("idol-dj-raw.png",      "idol-dj.png",      "green", ("height", 560)),
    # 게임플레이/UI 스프라이트
    ("receptor-raw.png", "receptor.png", "magenta", ("square", 256)),
    ("hold-note-raw.png", "hold-note.png", "magenta", ("square", 256)),
    ("star-note-raw.png", "star-note.png", "magenta", ("square", 256)),
    ("ring-raw.png",     "ring.png",      "magenta", ("square", 256)),
    ("hero-raw.png",       "hero.png",       None,    ("width", 1280)),
    ("fever-aura-raw.png", "fever-aura.png", "green", ("width", 1280)),
]


def main():
    done = []
    for src_name, dst_name, key, fit in MANIFEST:
        src = os.path.join(PIX, src_name)
        if not os.path.exists(src):
            continue
        img = Image.open(src)
        if key:
            img = chroma_key(img, key)
            img = autocrop(img)
        mode, px = fit
        img = fit_square(img, px) if mode == "square" else fit_dim(img, mode, px)
        out = os.path.join(PIX, dst_name)
        img.save(out, "PNG", optimize=True)
        done.append(f"{dst_name}  {img.width}x{img.height}  {os.path.getsize(out)//1024}KB")
    print("\n".join(done) if done else "처리할 원본 없음")


if __name__ == "__main__":
    main()
