"""Generate illustrated placeholder images and PDFs for the dummy content.

Run from the project root:  python3 scripts/generate-placeholders.py
Replace everything in public/media with real photos and documents (or serve from a CDN).
"""

import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "public" / "media"
CONTENT = ROOT / "src" / "content"

SEVERN = (36, 96, 90)
SEVERN_DEEP = (25, 72, 68)
WYRE = (92, 122, 62)
BUTTERCUP = (242, 201, 76)
MIST = (242, 245, 243)
INK = (23, 49, 46)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def sky(w, h, top, bottom):
    arr = np.zeros((h, w, 3), dtype=np.float32)
    t = np.linspace(0, 1, h)[:, None]
    for i in range(3):
        arr[:, :, i] = top[i] + (bottom[i] - top[i]) * t
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def hill_points(w, h, base, amp, rnd, waves=3):
    phases = [rnd.uniform(0, math.tau) for _ in range(waves)]
    freqs = [rnd.uniform(0.6, 1.4) * (k + 1) for k in range(waves)]
    pts = []
    for x in range(0, w + 8, 8):
        y = base
        for k in range(waves):
            y += amp / (k + 1) * math.sin(x / w * math.tau * freqs[k] / 2 + phases[k])
        pts.append((x, y))
    return pts


def draw_hills(img, rnd, colors, start=0.45, spread=0.4):
    w, h = img.size
    d = ImageDraw.Draw(img)
    layers = []
    for i, c in enumerate(colors):
        base = h * (start + spread * i / max(1, len(colors)))
        pts = hill_points(w, h, base, h * rnd.uniform(0.04, 0.09), rnd)
        d.polygon(pts + [(w, h), (0, h)], fill=c)
        layers.append(pts)
    return layers


def tree(d, x, y, size, color, kind):
    if kind == "conifer":
        d.polygon([(x, y - size * 2.2), (x - size * 0.7, y), (x + size * 0.7, y)], fill=color)
    else:
        d.rectangle([x - size * 0.08, y - size * 0.6, x + size * 0.08, y], fill=shade(color, 0.6))
        d.ellipse([x - size * 0.75, y - size * 1.9, x + size * 0.75, y - size * 0.45], fill=color)


def river(img, rnd, y0, color, width_frac=0.16):
    w, h = img.size
    d = ImageDraw.Draw(img)
    top, bottom = [], []
    phase = rnd.uniform(0, math.tau)
    for x in range(0, w + 8, 8):
        wobble = math.sin(x / w * math.pi * 1.6 + phase) * h * 0.025
        top.append((x, y0 + wobble))
        bottom.append((x, y0 + wobble + h * width_frac * (0.7 + 0.3 * x / w)))
    d.polygon(top + bottom[::-1], fill=color)
    for _ in range(26):
        x = rnd.uniform(0, w)
        y = rnd.uniform(y0 + h * 0.02, y0 + h * width_frac * 0.9)
        d.line([(x, y), (x + rnd.uniform(20, 70), y)], fill=mix(color, MIST, 0.35), width=3)


def bridge(img, x0, x1, deck_y, color, water=SEVERN, arches=3):
    d = ImageDraw.Draw(img)
    w = x1 - x0
    span = w / arches
    d.rectangle([x0, deck_y - span * 0.18, x1, deck_y + span * 0.55], fill=color)
    for i in range(arches):
        cx = x0 + span * (i + 0.5)
        r = span * 0.36
        d.rectangle([cx - r, deck_y + span * 0.05 + r, cx + r, deck_y + span * 0.6], fill=water)
        d.ellipse([cx - r, deck_y + span * 0.05, cx + r, deck_y + span * 0.05 + r * 2], fill=water)
    d.rectangle([x0, deck_y - span * 0.24, x1, deck_y - span * 0.18], fill=shade(color, 0.85))


def houses(img, rnd, y, x0, x1, height):
    d = ImageDraw.Draw(img)
    x = x0
    palette = [(232, 220, 200), (214, 196, 170), (238, 232, 220), (200, 182, 160), (226, 210, 186)]
    while x < x1:
        hw = rnd.uniform(height * 0.6, height * 1.1)
        hh = height * rnd.uniform(0.8, 1.15)
        c = rnd.choice(palette)
        d.rectangle([x, y - hh, x + hw, y], fill=c)
        d.polygon([(x - 4, y - hh), (x + hw / 2, y - hh - height * 0.28), (x + hw + 4, y - hh)], fill=(92, 84, 84))
        for row in range(2):
            for col in range(3):
                wx = x + hw * (0.18 + col * 0.28)
                wy = y - hh + hh * (0.18 + row * 0.38)
                d.rectangle([wx, wy, wx + hw * 0.12, wy + hh * 0.2], fill=(70, 86, 92))
        x += hw + 2


def grain(img, amount=7, seed=0):
    arr = np.asarray(img).astype(np.int16)
    noise = np.random.default_rng(seed).normal(0, amount, arr.shape[:2])[:, :, None]
    return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8), "RGB")


def scene(theme, w, h, seed):
    rnd = random.Random(seed)
    if theme == "forest":
        img = sky(w, h, (205, 224, 214), (238, 240, 222))
        d = ImageDraw.Draw(img)
        d.rectangle([0, h * 0.8, w, h], fill=(86, 104, 64))
        for i in range(5):
            y = h * (0.55 + i * 0.1)
            col = mix((150, 182, 150), (40, 74, 52), i / 4)
            for _ in range(10 + i * 3):
                tree(d, rnd.uniform(-40, w + 40), y + rnd.uniform(-20, 20), h * rnd.uniform(0.07, 0.12) * (1 + i * 0.25), col, rnd.choice(["conifer", "broad"]))
        light = Image.new("L", (w, h), 0)
        ld = ImageDraw.Draw(light)
        for _ in range(4):
            x = rnd.uniform(0, w)
            ld.polygon([(x, 0), (x + w * 0.08, 0), (x + w * 0.35, h), (x + w * 0.2, h)], fill=46)
        light = light.filter(ImageFilter.GaussianBlur(30))
        img = Image.composite(Image.new("RGB", (w, h), (255, 246, 210)), img, light)
    elif theme == "garden":
        img = sky(w, h, (196, 222, 230), (236, 242, 232))
        draw_hills(img, rnd, [(160, 190, 150), (118, 156, 96)], start=0.42, spread=0.2)
        d = ImageDraw.Draw(img)
        for i in range(3):
            bx = w * (0.08 + i * 0.31)
            by = h * (0.62 + (i % 2) * 0.06)
            d.rectangle([bx, by, bx + w * 0.26, by + h * 0.12], fill=(146, 108, 76))
            d.rectangle([bx, by - h * 0.02, bx + w * 0.26, by + h * 0.02], fill=(112, 150, 82))
        d.rectangle([0, h * 0.82, w, h], fill=(96, 136, 72))
        for _ in range(260):
            x, y = rnd.uniform(0, w), rnd.uniform(h * 0.58, h)
            r = rnd.uniform(4, 11)
            c = rnd.choice([BUTTERCUP, (236, 150, 170), (250, 250, 245), (170, 140, 210), (240, 170, 90)])
            d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    elif theme == "sports":
        img = sky(w, h, (178, 214, 236), (230, 240, 244))
        draw_hills(img, rnd, [(150, 184, 140)], start=0.4, spread=0)
        d = ImageDraw.Draw(img)
        d.rectangle([0, h * 0.5, w, h], fill=(110, 160, 86))
        vx = w * rnd.uniform(0.35, 0.65)
        for i in range(-6, 8):
            d.line([(vx + i * w * 0.02, h * 0.5), (vx + i * w * 0.22, h)], fill=(244, 246, 240), width=4)
        for row in range(2):
            y0 = h * (0.06 + row * 0.08)
            pts = [(x, y0 + math.sin(x / w * math.pi) * h * 0.04) for x in range(0, w + 1, 40)]
            d.line(pts, fill=(80, 80, 80), width=2)
            for j, (x, y) in enumerate(pts[:-1]):
                c = [BUTTERCUP, SEVERN, (220, 90, 80), (90, 140, 210)][j % 4]
                d.polygon([(x + 4, y), (x + 36, y + 2), (x + 20, y + 36)], fill=c)
    elif theme == "arts":
        img = Image.new("RGB", (w, h), (246, 243, 236))
        d = ImageDraw.Draw(img)
        for _ in range(9):
            x, y = rnd.uniform(0, w), rnd.uniform(0, h)
            r = rnd.uniform(h * 0.08, h * 0.3)
            c = rnd.choice([SEVERN, BUTTERCUP, WYRE, (120, 170, 200), (230, 140, 120), (180, 200, 220)])
            d.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=c)
        img = img.filter(ImageFilter.GaussianBlur(8))
        river(img, rnd, h * 0.66, (88, 140, 150), 0.3)
        bridge(img, w * 0.1, w * 0.9, h * 0.5, (196, 150, 120), water=(70, 120, 130))
    elif theme == "railway":
        img = sky(w, h, (190, 210, 228), (240, 236, 222))
        draw_hills(img, rnd, [(170, 196, 160), (128, 164, 110), (96, 132, 82)], start=0.38, spread=0.3)
        d = ImageDraw.Draw(img)
        ty = h * 0.74
        d.rectangle([0, ty + 26, w, ty + 34], fill=(70, 62, 58))
        x = w * rnd.uniform(0.15, 0.35)
        d.rectangle([x, ty - 70, x + 190, ty + 20], fill=(30, 80, 60))
        d.rectangle([x + 120, ty - 120, x + 190, ty - 70], fill=(30, 80, 60))
        d.rectangle([x + 20, ty - 110, x + 46, ty - 70], fill=(40, 40, 40))
        for k in range(3):
            cx = x + 200 + k * 175
            d.rectangle([cx, ty - 80, cx + 165, ty + 20], fill=(120, 40, 40))
            for wnd in range(4):
                d.rectangle([cx + 12 + wnd * 38, ty - 64, cx + 38 + wnd * 38, ty - 34], fill=(236, 228, 200))
        for k in range(10):
            wx = x + 20 + k * 70
            d.ellipse([wx, ty + 2, wx + 34, ty + 36], fill=(30, 30, 30))
        for k in range(6):
            r = 26 + k * 12
            d.ellipse([x + 33 - r - k * 30, ty - 120 - r - k * 34, x + 33 + r - k * 30, ty - 120 + r - k * 34], fill=(248, 248, 246))
    elif theme == "harvest":
        img = sky(w, h, (244, 214, 160), (250, 236, 206))
        d = ImageDraw.Draw(img)
        d.ellipse([w * 0.66, h * 0.14, w * 0.66 + h * 0.18, h * 0.32], fill=(250, 238, 200))
        draw_hills(img, rnd, [(196, 176, 110), (176, 150, 84), (150, 128, 70)], start=0.45, spread=0.28)
        for _ in range(7):
            x, y = rnd.uniform(0, w), rnd.uniform(h * 0.66, h * 0.92)
            r = h * rnd.uniform(0.04, 0.07)
            d.ellipse([x - r, y - r, x + r, y + r], fill=(222, 190, 110))
            d.ellipse([x - r * 0.55, y - r * 0.55, x + r * 0.55, y + r * 0.55], outline=(186, 150, 80), width=4)
    elif theme == "hero":
        img = sky(w, h, (196, 220, 222), (238, 242, 236))
        draw_hills(img, rnd, [(168, 196, 170), (124, 160, 120)], start=0.34, spread=0.12)
        houses(img, rnd, h * 0.56, -20, w + 20, h * 0.1)
        river(img, rnd, h * 0.6, (88, 146, 150), 0.42)
        bridge(img, -w * 0.05, w * 1.05, h * 0.6, (198, 150, 118), water=(70, 126, 132))
    else:
        img = sky(w, h, (210, 222, 218), (238, 240, 236))
    return grain(img, seed=seed)


def portrait(w, h, seed):
    img = sky(w, h, (214, 228, 222), (236, 240, 234))
    d = ImageDraw.Draw(img)
    d.ellipse([w * 0.12, h * 0.62, w * 0.88, h * 1.25], fill=SEVERN_DEEP)
    d.rectangle([w * 0.43, h * 0.5, w * 0.57, h * 0.68], fill=(208, 170, 146))
    d.rounded_rectangle([w * 0.25, h * 0.15, w * 0.75, h * 0.62], radius=w * 0.24, fill=(110, 82, 66))
    d.ellipse([w * 0.32, h * 0.23, w * 0.68, h * 0.58], fill=(214, 176, 152))
    d.chord([w * 0.29, h * 0.15, w * 0.71, h * 0.42], 180, 360, fill=(110, 82, 66))
    return grain(img, seed=seed)


GALLERY = [
    ("forest-school", "forest", "Forest school in Ribbesford Woods", "Den building, fire safety and a lot of mud. Our Explorers class spends every Wednesday afternoon in the woods.", "2026-10-07",
     ["Pupils building a den from fallen branches", "A group listening to birdsong in a clearing", "Toasting marshmallows at the fire circle", "Collecting leaves for a sorting game", "Walking the woodland path together", "Making a mud kitchen recipe"]),
    ("sensory-garden", "garden", "The new sensory garden", "Raised beds, a water wall and scented planting, built with help from families and the Bewdley Rotary Club.", "2026-06-19",
     ["Raised beds planted with lavender and mint", "Pupils watering the herb bed", "The finished garden in full flower", "Planting bulbs along the fence", "A quiet corner with wind chimes"]),
    ("sports-day", "sports", "Sports day 2026", "Every pupil took part, with adapted races, a parachute game and the staff relay nobody wants to talk about.", "2026-07-08",
     ["The start of the 50 metre race", "Bunting across the school field", "The parachute game with Class 4", "Families cheering at the finish line", "Medals for everyone", "The staff relay"]),
    ("arts-week", "arts", "Arts week: rivers and bridges", "A week of painting, printmaking and clay, inspired by the Severn and Bewdley Bridge.", "2026-03-20",
     ["A collaborative painting of the river", "Clay bridges drying on the windowsill", "Printmaking with leaves", "The finished exhibition in the hall", "Painting with sponges and rollers"]),
    ("railway-trip", "railway", "A trip on the Severn Valley Railway", "Sixth formers planned the whole day, from buying tickets to choosing lunch at Highley.", "2026-05-14",
     ["The steam train arriving at Bewdley station", "Looking out across the valley", "Planning the route on the map", "Lunch at Highley", "Waving goodbye to the train"]),
    ("harvest", "harvest", "Harvest celebration", "Our harvest assembly collected food for the Wyre Forest food bank.", "2026-10-16",
     ["Harvest boxes ready for the food bank", "Singing at the harvest assembly", "Pupils sorting donated food", "Autumn fields on the walk to school"]),
]


def save(img, rel, quality=82):
    path = MEDIA / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def build_images():
    albums = []
    for idx, (album_id, theme, title, desc, date, captions) in enumerate(GALLERY):
        images = []
        for n, caption in enumerate(captions):
            portrait_frame = n % 4 == 2
            w, h = (1200, 1500) if portrait_frame else (1600, 1200)
            key = f"gallery/{album_id}/{n + 1:02d}.jpg"
            save(scene(theme, w, h, seed=idx * 100 + n), key)
            images.append({"key": key, "alt": caption, "caption": caption, "width": w, "height": h})
        albums.append({"id": album_id, "title": title, "description": desc, "date": date, "images": images})
    (CONTENT / "gallery.json").write_text(json.dumps(albums, indent=2) + "\n")

    save(scene("hero", 1400, 1750, seed=7), "site/hero.jpg", quality=85)
    save(portrait(900, 1100, seed=11), "site/headteacher.jpg", quality=85)


def build_pdfs():
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    styles = getSampleStyleSheet()
    policies = json.loads((CONTENT / "policies.json").read_text())
    vacancies = json.loads((CONTENT / "vacancies.json").read_text())

    docs = [(p["file"]["key"], p["title"], p["summary"]) for p in policies if p["file"]["format"] == "pdf"]
    docs += [(v["applicationPack"]["key"], f"{v['title']}: application pack", v["summary"]) for v in vacancies if v.get("applicationPack")]

    body = (
        "This is placeholder text for the Wribbenhall School website. Replace this file with the "
        "approved document from the school office. "
    ) * 6

    for key, title, summary in docs:
        path = MEDIA / key
        path.parent.mkdir(parents=True, exist_ok=True)
        doc = SimpleDocTemplate(str(path), pagesize=A4, title=title, author="Wribbenhall School")
        story = [
            Paragraph("Wribbenhall School", styles["Normal"]),
            Spacer(1, 12),
            Paragraph(title, styles["Title"]),
            Paragraph(summary, styles["Italic"]),
            Spacer(1, 18),
        ]
        for heading in ["Purpose", "Scope", "Roles and responsibilities", "Monitoring and review"]:
            story += [Paragraph(heading, styles["Heading2"]), Paragraph(body, styles["BodyText"]), Spacer(1, 8)]
        doc.build(story)

    for p in policies:
        p["file"]["sizeBytes"] = (MEDIA / p["file"]["key"]).stat().st_size
    for v in vacancies:
        if v.get("applicationPack"):
            v["applicationPack"]["sizeBytes"] = (MEDIA / v["applicationPack"]["key"]).stat().st_size
    (CONTENT / "policies.json").write_text(json.dumps(policies, indent=2) + "\n")
    (CONTENT / "vacancies.json").write_text(json.dumps(vacancies, indent=2) + "\n")


if __name__ == "__main__":
    build_images()
    build_pdfs()
    print("Placeholders written to", MEDIA)
