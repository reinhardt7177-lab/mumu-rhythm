"""프리뷰 canvas 데이터URL(eval 결과 txt)을 이미지 파일로 디코드."""
import base64
import sys

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else "assets/pixel/_preview.jpg"
s = open(src, encoding="utf-8").read()
i = s.find("base64,")
b = s[i + 7:].strip().strip('"').strip()
open(out, "wb").write(base64.b64decode(b))
print("saved", out, len(b), "b64 chars")
