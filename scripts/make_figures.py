#!/usr/bin/env python3
"""Draw the data-descriptor figures (Fig. 1–4) from the released files.

The figures are built for Scientific Data at Nature Portfolio specification:
183 mm double-column width, Arial 5–7 pt, 8 pt bold lowercase panel labels,
strokes of 0.25–1 pt, Okabe–Ito colours, white ground, no gridlines. Each is
written twice — a vector PDF whose text stays live (TrueType, never outlines)
and an 800-dpi RGB PNG — at its exact physical size. bbox_inches="tight" is
never used, because it changes the printed width.

Every quantity drawn or printed is computed here from the released layers
(01_source_catalog/ to 09_validation/ and 02_source_texts/). The only values
typed in are display labels — romanised titles, English section and field
names — and each is checked against the data when the script runs, so a
change to the data cannot leave a stale label behind.

One colour language runs through all four figures:

    black       canonical text (the 398 numbered clauses)
    blue        commentary
    vermillion  variant witness
    grey        everything else

Before anything is written, each figure is audited: text outside 5–7 pt,
coloured text, strokes outside 0.25–1 pt, text that runs off the page or
collides with other text, a Latin glyph that would fall back to the CJK font,
and a page that is not 183 mm wide all stop the script.

Usage:  python3 scripts/make_figures.py
Needs:  matplotlib >= 3.6, numpy, Pillow, fontTools; Arial (or Helvetica) and
        a CJK font with Traditional Chinese coverage (Noto Sans CJK TC,
        WenQuanYi Zen Hei, ...).
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median
from types import SimpleNamespace

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from fontTools.ttLib import TTCollection, TTFont  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.collections import Collection  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap, to_hex, to_rgb  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Patch, Rectangle  # noqa: E402
from matplotlib.text import Text  # noqa: E402
from matplotlib.ticker import LogLocator, NullFormatter  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "figures"

WIDTH_MM = 183.0  # Nature Portfolio double column
MAX_HEIGHT_MM = 170.0
DPI = 800
MM = 1 / 25.4  # inches per millimetre

# Type ladder, in points at final size.
PT = 6.0  # body text, axis labels, box titles
PT_S = 5.5  # tick labels, keys, box text
PT_XS = 5.0  # the floor: dense annotations only
PT_PANEL = 8.0  # panel letters

# Strokes, in points.
LW_AXIS = 0.6
LW_BOX = 0.6
LW_DATA = 1.0
LW_THIN = 0.4

# Okabe–Ito.
BLACK = "#000000"
BLUE = "#0072B2"
VERMILLION = "#D55E00"
GREY = "#999999"
WHITE = "#FFFFFF"

LATIN_FONTS = ["Arial", "Helvetica"]
CJK_FONTS = [
    "Noto Sans CJK TC",
    "Source Han Sans TC",
    "Noto Sans CJK SC",
    "WenQuanYi Zen Hei",
    "PingFang TC",
    "Microsoft JhengHei",
    "Heiti TC",
]

# ---------------------------------------------------------------------------
# Display labels. Keys are catalogue source_ids; every Han title and author is
# checked against the data at run time.
# ---------------------------------------------------------------------------

# The two canonical texts that supply the clause layer.
CANON_WORKS = {
    "SHSRC0033": ("C", "傷寒論", "Shanghan Lun, clause edition"),
    "SHSRC0035": ("S", "傷寒論(宋本)", "Shanghan Lun, Song edition"),
}

# The two variant witnesses.
VARIANT_WORKS = {
    "SHSRC0050": ("G", "傷寒雜病論(桂本)", "Shanghan Zabing Lun, Gui edition", "Gui edition"),
    "SHSRC0034": ("Q", "傷寒論(千金翼方)", "Shanghan Lun in Qianjin Yifang", "Qianjin Yifang"),
}

# The nine clause-aligned commentaries, numbered in order of composition. The
# catalogue dates only two of them, so the order within the Qing follows the
# conventional dating of the works (1644, 1669, 1669, 1707, 1729, 1748).
COMMENTARY_WORKS = [
    ("SHSRC0055", "註解傷寒論", "成無己", "Zhujie Shanghan Lun", "Cheng Wuji"),
    ("SHSRC0036", "傷寒論條辨", "方有執", "Shanghan Lun Tiaobian", "Fang Youzhi"),
    ("SHSRC0052", "張卿子傷寒論", "張卿子", "Zhang Qingzi Shanghan Lun", "Zhang Qingzi"),
    ("SHSRC0038", "傷寒論注", "柯琴", "Shanghan Lun Zhu", "Ke Qin"),
    ("SHSRC0005", "傷寒來蘇集", "柯琴", "Shanghan Laisu Ji", "Ke Qin"),
    ("SHSRC0022", "傷寒溯源集", "錢潢", "Shanghan Suyuan Ji", "Qian Huang"),
    ("SHSRC0045", "傷寒貫珠集", "尤怡", "Shanghan Guanzhu Ji", "You Yi"),
    ("SHSRC0013", "傷寒懸解", "黃元御", "Shanghan Xuanjie", "Huang Yuanyu"),
    ("SHSRC0041", "傷寒論輯義", "丹波元簡", "Shanghan Lun Jiyi", "Tamba Motoyasu"),
]

# Catalogue `dynasty` value -> axis label and conventional date range.
PERIODS = [
    ("Eastern Han", "Eastern Han", "25–220"),
    ("Song", "Song", "960–1279"),
    ("Jin (1115-1234)", "Jin", "1115–1234"),
    ("Yuan", "Yuan", "1271–1368"),
    ("Ming", "Ming", "1368–1644"),
    ("Qing", "Qing", "1644–1911"),
    ("not_stated_in_source", "Not stated", ""),
]

# Clause `six_channel` value -> short label, full label.
SECTIONS = {
    "太陽病": ("Taiyang", "Taiyang"),
    "陽明病": ("Yangming", "Yangming"),
    "少陽病": ("Shaoyang", "Shaoyang"),
    "太陰病": ("Taiyin", "Taiyin"),
    "少陰病": ("Shaoyin", "Shaoyin"),
    "厥陰病": ("Jueyin", "Jueyin"),
    "霍亂病": ("Huoluan", "Huoluan"),
    "陰陽易差後勞復病": ("Relapse", "Yin–yang exchange, relapse"),  # 陰陽易差後勞復
}

# The fifteen list-valued annotation fields of a clause record, grouped.
FIELD_GROUPS = [
    (
        "Findings",
        [
            ("symptoms", "Symptoms"),
            ("negated_findings", "Negated findings"),
            ("pulse", "Pulse"),
            ("disease_patterns", "Disease pattern"),
            ("time_course", "Time course"),
        ],
    ),
    (
        "Treatment",
        [
            ("therapy_terms", "Therapy"),
            ("formula_names", "Formula name"),
            ("formula_blocks", "Formula block"),
            ("herbs", "Herbs"),
        ],
    ),
    (
        "Course",
        [
            ("contraindication_terms", "Contraindication"),
            ("mistreatment_terms", "Mistreatment"),
            ("transformation_terms", "Transformation"),
            ("prognosis_terms", "Prognosis"),
        ],
    ),
    ("Text", [("logic_words", "Logic words"), ("collation_notes", "Collation notes")]),
]

RELATION_LABELS = {
    "commentary_support": "Commentary support",
    "variant": "Variant reading",
    "sequence": "Sequence",
    "same_formula_family": "Same formula family",
    "differential": "Differential",
    "mistreatment_transformation": "Mistreatment–transformation",
    "transmission": "Transmission",
    "contraindication": "Contraindication",
}

FEATURED_CLAUSE = 23
FEATURED_FORMULA = ("桂枝麻黃各半湯", "Guizhi Mahuang Geban Tang")


# ---------------------------------------------------------------------------
# Style
# ---------------------------------------------------------------------------


def pick_font(candidates: list[str]) -> str | None:
    available = {f.name for f in font_manager.fontManager.ttflist}
    return next((name for name in candidates if name in available), None)


def setup_style() -> SimpleNamespace:
    latin = pick_font(LATIN_FONTS)
    cjk = pick_font(CJK_FONTS)
    if latin is None:
        sys.exit("Arial or Helvetica is required: Nature Portfolio figures use one of them throughout.")
    if cjk is None:
        sys.exit("A CJK font with Traditional Chinese coverage is required for the Han titles.")
    # A CJK face without a bold weight is a harmless substitution, not a warning.
    logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update(
        {
            "font.family": [latin, cjk],  # Han glyphs fall back to the CJK face
            "font.size": PT,
            "axes.labelsize": PT,
            "axes.titlesize": PT,
            "xtick.labelsize": PT_S,
            "ytick.labelsize": PT_S,
            "legend.fontsize": PT_S,
            "axes.linewidth": LW_AXIS,
            "axes.edgecolor": BLACK,
            "axes.labelcolor": BLACK,
            "axes.facecolor": "none",
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": False,
            "axes.labelpad": 2.0,
            "axes.unicode_minus": True,
            "xtick.color": BLACK,
            "ytick.color": BLACK,
            "xtick.direction": "out",
            "ytick.direction": "out",
            "xtick.major.width": LW_AXIS,
            "ytick.major.width": LW_AXIS,
            "xtick.minor.width": LW_THIN,
            "ytick.minor.width": LW_THIN,
            "xtick.major.size": 2.2,
            "ytick.major.size": 2.2,
            "xtick.minor.size": 1.3,
            "ytick.minor.size": 1.3,
            "xtick.major.pad": 1.5,
            "ytick.major.pad": 1.5,
            "lines.linewidth": LW_DATA,
            "patch.linewidth": LW_BOX,
            "legend.frameon": False,
            "figure.facecolor": WHITE,
            "savefig.facecolor": WHITE,
            "savefig.bbox": "standard",
            "savefig.pad_inches": 0,
            "pdf.fonttype": 42,  # TrueType: text stays live and editable
            "ps.fonttype": 42,
            "svg.fonttype": "none",
            "mathtext.default": "regular",
        }
    )
    return SimpleNamespace(latin=latin, cjk=cjk)


def tint(colour: str, amount: float) -> tuple[float, float, float]:
    """`colour` mixed with white: 0 is white, 1 is the colour itself."""
    r, g, b = to_rgb(colour)
    return (1 - amount * (1 - r), 1 - amount * (1 - g), 1 - amount * (1 - b))


class Canvas:
    """A figure laid out in millimetres, measured from its top-left corner.

    `mm` is a page-sized axes in millimetre units (y grows downward) for
    schematic drawing and labels; `axes()` places plotting axes by the same
    coordinates.
    """

    def __init__(self, height_mm: float):
        if height_mm > MAX_HEIGHT_MM:
            raise ValueError(f"{height_mm} mm exceeds the {MAX_HEIGHT_MM} mm page height")
        self.w, self.h = WIDTH_MM, height_mm
        self.fig = plt.figure(figsize=(self.w * MM, self.h * MM))
        self.mm = self.fig.add_axes((0, 0, 1, 1))
        self.mm.set_xlim(0, self.w)
        self.mm.set_ylim(self.h, 0)
        self.mm.set_axis_off()

    def axes(self, x: float, y: float, w: float, h: float):
        return self.fig.add_axes((x / self.w, 1 - (y + h) / self.h, w / self.w, h / self.h))

    def panel(self, letter: str, x: float, y: float) -> None:
        label = self.fig.text(
            x / self.w, 1 - y / self.h, letter, fontsize=PT_PANEL, fontweight="bold", ha="left", va="top"
        )
        label.set_gid("panel-label")

    def text(self, x: float, y: float, s: str, size: float = PT_S, **kw) -> Text:
        kw.setdefault("va", "center")
        return self.mm.text(x, y, s, fontsize=size, **kw)


def rounded_box(ax, x, y, w, h, ec=GREY, fc=WHITE, lw=LW_BOX, ls="-", z=2.0):
    """A rounded rectangle whose (x, y) is its top-left corner in millimetres."""
    patch = FancyBboxPatch(
        (x, y), w, h, boxstyle="round,pad=0,rounding_size=0.9", ec=ec, fc=fc, lw=lw, ls=ls, zorder=z
    )
    ax.add_patch(patch)
    return patch


def arrow(ax, start, end, colour=BLACK, lw=LW_BOX, z=1.5):
    ax.add_patch(
        FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>,head_length=2.6,head_width=1.2",
            mutation_scale=1,
            lw=lw,
            color=colour,
            shrinkA=0,
            shrinkB=0,
            zorder=z,
        )
    )


# matplotlib centres a line's box, descender included, so a capital or a digit
# set with va="center" sits about 0.1 em high; this is the correction.
CAP_DROP_MM = 0.1 * PT_XS / 72 * 25.4


def badge(ax, x, y, label, colour, d=2.6, z=4.0):
    """A filled circle carrying a white identifier, in millimetre coordinates."""
    ax.add_patch(Circle((x, y), d / 2, fc=colour, ec="none", zorder=z))
    ax.text(x, y + CAP_DROP_MM, label, fontsize=PT_XS, fontweight="bold", color=WHITE, ha="center", va="center", zorder=z + 0.1)


def swarm(y: list[float], d: list[float], gap: float = 0.25, step: float = 0.05) -> list[float]:
    """Horizontal offsets (mm) that keep circles of diameter d at heights y apart.

    Larger markers are placed first, so they sit on the centre line.
    """
    order = sorted(range(len(y)), key=lambda i: (-d[i], y[i]))
    candidates = [0.0] + [s * k * step for k in range(1, 4000) for s in (1, -1)]
    placed: list[tuple[float, float, float]] = []
    x = [0.0] * len(y)
    for i in order:
        for c in candidates:
            if all((c - px) ** 2 + (y[i] - py) ** 2 >= ((d[i] + pd) / 2 + gap) ** 2 for px, py, pd in placed):
                x[i] = c
                break
        placed.append((x[i], y[i], d[i]))
    return x


def thousands(n: int) -> str:
    return f"{n:,}"


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------


def read_jsonl(rel: str) -> list[dict]:
    with open(ROOT / rel, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def read_csv(rel: str) -> list[dict]:
    with open(ROOT / rel, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def check(condition: bool, message: str) -> None:
    if not condition:
        sys.exit(f"data check failed: {message}")


def load() -> SimpleNamespace:
    d = SimpleNamespace()
    d.works = read_csv("01_source_catalog/sources.csv")
    d.work = {w["source_id"]: w for w in d.works}
    d.provenance = {r["source_id"]: r for r in read_csv("01_source_catalog/source_provenance.csv")}
    d.manifest = read_csv("02_source_texts/file_manifest.csv")
    d.clauses = read_jsonl("03_clauses/clauses.jsonl")
    d.comms = read_jsonl("04_commentaries/commentaries.jsonl")
    d.variants = read_jsonl("05_textual_variants/variants.jsonl")
    d.relations = read_jsonl("06_relations/relations.jsonl")
    d.nodes = read_jsonl("06_relations/nodes.jsonl")
    d.unified = read_jsonl("07_unified_records/unified_text_records.jsonl")
    d.validation = json.loads((ROOT / "09_validation/validation_report.json").read_text(encoding="utf-8"))
    d.schema = json.loads((ROOT / "09_validation/schema_report.json").read_text(encoding="utf-8"))
    d.integrity = json.loads((ROOT / "09_validation/integrity_report.json").read_text(encoding="utf-8"))
    for w in d.works:
        w["chars"] = int(w["characters"])

    # --- the roles, derived from the layers and checked against the labels
    d.canon_ids = sorted({c["source_id"] for c in d.clauses})
    d.variant_ids = sorted({v["source_id"] for v in d.variants})
    d.comm_ids = [row[0] for row in COMMENTARY_WORKS]
    check(set(d.canon_ids) == set(CANON_WORKS), f"clause sources {d.canon_ids}")
    check(set(d.variant_ids) == set(VARIANT_WORKS), f"variant sources {d.variant_ids}")
    check({c["source_id"] for c in d.comms} == set(d.comm_ids), "commentary sources")
    check(len(d.comm_ids) == len(set(d.comm_ids)), "duplicate commentary label")
    for sid, (_, zh, _) in CANON_WORKS.items():
        check(d.work[sid]["title_zh"] == zh and d.work[sid]["work_type"] == "canonical_text", sid)
    for sid, (_, zh, _, _) in VARIANT_WORKS.items():
        check(d.work[sid]["title_zh"] == zh and d.work[sid]["work_type"] == "variant_edition", sid)
    books = {(c["source_id"], c["book"], c["commentator"]) for c in d.comms}
    for sid, zh, author_zh, _, _ in COMMENTARY_WORKS:
        check(d.work[sid]["title_zh"] == zh, f"{sid} title")
        check(books & {(sid, zh, author_zh)} == {(sid, zh, author_zh)}, f"{sid} commentator {author_zh}")
    d.role = {}
    for w in d.works:
        sid = w["source_id"]
        d.role[sid] = (
            "canon" if sid in CANON_WORKS else "variant" if sid in VARIANT_WORKS else "commentary" if sid in d.comm_ids else "other"
        )
    d.n_role = Counter(d.role.values())

    period_keys = [p[0] for p in PERIODS]
    check({w["dynasty"] for w in d.works} <= set(period_keys), "unmapped period")

    # --- canonical clauses and sections
    d.canon = sorted((c for c in d.clauses if c["canonical_clause_no"] is not None), key=lambda c: c["canonical_clause_no"])
    d.n_canon = len(d.canon)
    check([c["canonical_clause_no"] for c in d.canon] == list(range(1, d.n_canon + 1)), "canonical numbering")
    d.clause_no = {c["clause_id"]: c["canonical_clause_no"] for c in d.canon}
    sections: list[list] = []
    for c in d.canon:
        if not sections or sections[-1][0] != c["six_channel"]:
            sections.append([c["six_channel"], c["canonical_clause_no"], c["canonical_clause_no"]])
        sections[-1][2] = c["canonical_clause_no"]
    check(len(sections) == len({s[0] for s in sections}), "a section is not contiguous")
    check({s[0] for s in sections} == set(SECTIONS), "unmapped section")
    d.sections = [SimpleNamespace(zh=zh, short=SECTIONS[zh][0], long=SECTIONS[zh][1], first=a, last=b, n=b - a + 1) for zh, a, b in sections]

    list_fields = {k for k, v in d.clauses[0].items() if isinstance(v, list)}
    grouped = [key for _, fields in FIELD_GROUPS for key, _ in fields]
    check(set(grouped) == list_fields and len(grouped) == len(list_fields), f"annotation fields {sorted(list_fields)}")

    # --- commentary coverage and scores, per work
    d.comm_by_work = defaultdict(list)
    for c in d.comms:
        check(c["clause_id"] in d.clause_no, f"{c['commentary_id']} is not aligned to a canonical clause")
        d.comm_by_work[c["source_id"]].append(c)
    d.covered = {sid: {d.clause_no[c["clause_id"]] for c in d.comm_by_work[sid]} for sid in d.comm_ids}
    d.works_per_clause = [sum(n in d.covered[sid] for sid in d.comm_ids) for n in range(1, d.n_canon + 1)]
    d.uncovered = [n for n, k in enumerate(d.works_per_clause, 1) if k == 0]
    d.scores = {sid: [c["alignment_similarity"] for c in d.comm_by_work[sid]] for sid in d.comm_ids}

    d.var_by_work = defaultdict(list)
    for v in d.variants:
        check(v["clause_id"] in d.clause_no, f"{v['variant_id']} is not aligned to a canonical clause")
        d.var_by_work[v["source_id"]].append(v)
    d.var_ids = list(VARIANT_WORKS)
    d.var_covered = {sid: {d.clause_no[v["clause_id"]] for v in d.var_by_work[sid]} for sid in d.var_ids}
    d.var_sims = {sid: [v["similarity"] for v in d.var_by_work[sid]] for sid in d.var_ids}

    d.relation_counts = Counter(r["relation_type"] for r in d.relations)
    check(set(d.relation_counts) == set(RELATION_LABELS), f"relation types {sorted(d.relation_counts)}")
    d.relation_target = {}
    for r in d.relations:
        d.relation_target.setdefault(r["relation_type"], set()).add(r["target_node_type"])

    # --- the featured clause and its provenance chain
    c = d.canon[FEATURED_CLAUSE - 1]
    d.fc = c
    check(hashlib.sha256(c["original_text"].encode("utf-8")).hexdigest() == c["sha256"], "clause text hash")
    files = [m for m in d.manifest if m["source_id"] == c["source_id"]]
    check(len(files) == 1, "featured work is not a single file")
    d.fc_file = files[0]
    digest = hashlib.sha256((ROOT / d.fc_file["relative_path"]).read_bytes()).hexdigest()
    check(digest == d.fc_file["sha256"], "featured source file checksum")
    sums = dict(
        (path, h) for h, path in (line.split(None, 1) for line in (ROOT / "SHA256SUMS.txt").read_text().splitlines() if line.strip())
    )
    check(sums.get(d.fc_file["relative_path"]) == digest, "featured file not in SHA256SUMS.txt")
    d.fc_comms = [x for x in d.comms if x["clause_id"] == c["clause_id"]]
    d.fc_vars = [x for x in d.variants if x["clause_id"] == c["clause_id"]]
    d.fc_links = defaultdict(list)
    for r in d.relations:
        if r["source_node_type"] == "clause" and r["target_node_type"] == "clause":
            if r["source_node_id"] == c["clause_id"]:
                d.fc_links[r["relation_type"]].append(d.clause_no.get(r["target_node_id"]))
            elif r["target_node_id"] == c["clause_id"]:
                d.fc_links[r["relation_type"]].append(d.clause_no.get(r["source_node_id"]))
    check(all(None not in v for v in d.fc_links.values()), "featured clause links an auxiliary clause")
    check(FEATURED_FORMULA[0] in c["formula_names"], "featured formula")

    # --- release metadata
    cff = (ROOT / "CITATION.cff").read_text(encoding="utf-8")
    d.doi = re.search(r'^doi:\s*"?([^"\s]+)"?', cff, re.M).group(1)
    d.version = d.validation["version"]
    check("CC BY 4.0" in (ROOT / "LICENSE.md").read_text(encoding="utf-8"), "licence")
    return d


# ---------------------------------------------------------------------------
# Fig. 1 — construction and provenance
# ---------------------------------------------------------------------------


def fig1(d) -> Canvas:
    cv = Canvas(95.0)
    ax = cv.mm
    cv.panel("a", 0, 0)

    top, bottom, box_h = 9.0, 64.0, 11.4
    gap = (bottom - top - 4 * box_h) / 3
    rows = [top + i * (box_h + gap) for i in range(4)]
    mid = [r + box_h / 2 for r in rows]
    cols = {  # stage: (x, width)
        "acquire": (1.5, 23.0),
        "role": (28.5, 25.0),
        "structure": (57.5, 33.0),
        "link": (94.5, 24.0),
        "validate": (122.5, 35.0),
        "release": (161.5, 20.0),
    }
    stages = {
        "acquire": "Acquisition",
        "role": "Evidence role",
        "structure": "Structuring",
        "link": "Linking",
        "validate": "Validation",
        "release": "Release",
    }
    for key, (x, w) in cols.items():
        cv.text(x + w / 2, 5.0, stages[key], PT_S, ha="center", fontweight="bold")

    def lines(x, yc, items, step=2.45, ha="center"):
        """Lines of text centred as a block on yc."""
        y0 = yc - step * (len(items) - 1) / 2
        for i, (s, bold) in enumerate(items):
            cv.text(x, y0 + i * step, s, PT_S, ha=ha, fontweight="bold" if bold else "normal")

    # Acquisition
    x, w = cols["acquire"]
    rounded_box(ax, x, top, w, bottom - top, ec=GREY)
    n_files = len(d.manifest)
    n_chars = sum(w_["chars"] for w_ in d.works)
    present = [label for key, label, _ in PERIODS if key != "not_stated_in_source" and any(w_["dynasty"] == key for w_ in d.works)]
    repo = d.provenance[d.canon_ids[0]]["source_url"].split("/")[2]
    lines(
        x + w / 2,
        (top + bottom) / 2,
        [
            ("Source texts", True),
            (f"{len(d.works)} works", False),
            (f"{thousands(n_files)} files", False),
            (f"{n_chars / 1e6:.2f} M characters", False),
            (f"{present[0]} to {present[-1]}", False),
            ("", False),
            ("Database of Chinese", False),
            ("Medical Classics", False),
            (f"({repo})", False),
        ],
    )

    # Evidence roles and their structuring
    roles = [
        ("canon", BLACK, "Canonical text", f"{d.n_role['canon']} works"),
        ("variant", VERMILLION, "Variant editions", f"{d.n_role['variant']} works"),
        ("commentary", BLUE, "Commentaries", f"{d.n_role['commentary']} works"),
        ("other", GREY, "Other works", f"{d.n_role['other']} works"),
    ]
    n_aux = len(d.clauses) - d.n_canon
    structuring = [
        ["Clause segmentation", f"{thousands(len(d.clauses))} clauses", f"({d.n_canon} canonical, {n_aux} auxiliary)"],
        ["Clause alignment", f"{thousands(len(d.variants))} variant readings"],
        ["Clause alignment", f"{thousands(len(d.comms))} commentary records"],
        ["Catalogue and full text", "not aligned in this release"],
    ]
    for i, ((_, colour, title, sub), struct) in enumerate(zip(roles, structuring)):
        fill = tint(colour, 0.10 if colour != BLACK else 0.08)
        x, w = cols["role"]
        rounded_box(ax, x, rows[i], w, box_h, ec=colour, fc=fill, ls="-" if colour != GREY else (0, (3, 1.5)))
        lines(x + w / 2, mid[i], [(title, True), (sub, False)])
        x, w = cols["structure"]
        rounded_box(ax, x, rows[i], w, box_h, ec=colour, fc=fill, ls="-" if colour != GREY else (0, (3, 1.5)))
        items = [(struct[0], True)] + [(s, False) for s in struct[1:]]
        lines(x + w / 2, mid[i], items)
        arrow(ax, (cols["acquire"][0] + cols["acquire"][1], mid[i]), (cols["role"][0], mid[i]))
        arrow(ax, (cols["role"][0] + cols["role"][1], mid[i]), (cols["structure"][0], mid[i]))

    # Linking
    x, w = cols["link"]
    link_bottom = rows[2] + box_h
    rounded_box(ax, x, top, w, link_bottom - top, ec=GREY)
    n_types = len(d.relation_counts)
    lines(
        x + w / 2,
        (top + link_bottom) / 2,
        [
            ("Relation graph", True),
            (f"{thousands(len(d.nodes))} nodes", False),
            (f"{thousands(len(d.relations))} edges", False),
            (f"{n_types} relation types", False),
            ("", False),
            ("Unified records", True),
            (f"{thousands(len(d.unified))} texts", False),
        ],
    )
    for i in range(3):
        arrow(ax, (cols["structure"][0] + cols["structure"][1], mid[i]), (x, mid[i]))
    # the uncatalogued-text lane runs beneath the graph straight to validation
    arrow(ax, (cols["structure"][0] + cols["structure"][1], mid[3]), (cols["validate"][0], mid[3]))

    # Validation
    x, w = cols["validate"]
    rounded_box(ax, x, top, w, bottom - top, ec=GREY)
    v = d.validation
    n_layers = len(d.schema["files"])
    n_pass = sum(f["status"] == "PASS" for f in d.schema["files"].values())
    prov = v["provenance_resolution"]
    traced = sum(prov[k]["resolved_to_source_files"] for k in prov)
    records = sum(prov[k]["records"] for k in prov)
    sha_ok = d.integrity["hash_match"]
    checks = [
        ("Schema", f"{n_pass}/{n_layers} layers pass"),
        ("Duplicate IDs", f"{v['schema_validation']['duplicate_identifiers']}"),
        ("Orphan edges", f"{v['structural_consistency']['orphan_relation_endpoints']}"),
        ("Traced to files", f"{thousands(traced)}/{thousands(records)}"),
        ("SHA-256", f"{sha_ok}/{d.integrity['files_in_manifest']} files"),
    ]
    yc = (top + bottom) / 2
    step = 2.9
    y0 = yc - step * len(checks) / 2
    cv.text(x + w / 2, y0, "Validation", PT_S, ha="center", fontweight="bold")
    for i, (label, value) in enumerate(checks, 1):
        cv.text(x + 2.0, y0 + i * step, label, PT_S, ha="left")
        cv.text(x + w - 2.0, y0 + i * step, value, PT_S, ha="right")
    arrow(ax, (cols["link"][0] + cols["link"][1], (top + link_bottom) / 2), (x, (top + link_bottom) / 2))

    # Release
    x, w = cols["release"]
    rounded_box(ax, x, top, w, bottom - top, ec=GREY)
    prefix, suffix = d.doi.split("/", 1)
    lines(
        x + w / 2,
        (top + bottom) / 2,
        [
            (f"Release {d.version}", True),
            ("JSONL and CSV", False),
            ("CC BY 4.0", False),
            ("(structured layers)", False),
            ("", False),
            ("Zenodo DOI", False),
            (f"{prefix}/", False),
            (suffix, False),
        ],
    )
    arrow(ax, (cols["validate"][0] + cols["validate"][1], (top + bottom) / 2), (x, (top + bottom) / 2))

    # --- b: provenance chain of one record
    cv.panel("b", 0, 70.0)
    y0, h = 75.5, 18.0
    boxes = [(1.5, 42.0), (55.5, 35.0), (102.5, 41.0), (155.5, 26.0)]
    c = d.fc
    work = d.work[c["source_id"]]
    section = next(s for s in d.sections if s.first <= FEATURED_CLAUSE <= s.last)
    excerpt = c["original_text"][: c["original_text"].index("，", 10)] + "……"
    period = next(label for key, label, _ in PERIODS if key == work["dynasty"])
    fhash, chash = d.fc_file["sha256"], c["sha256"]
    content = [
        [
            ("Clause record", True),
            (c["clause_id"], False),
            (f"Canonical clause {FEATURED_CLAUSE} · {section.short}", False),
            (excerpt, False),
            (f"Text SHA-256 {chash[:8]}…{chash[-8:]}", False),
        ],
        [
            ("Catalogued work", True),
            (f"{work['source_id']} · {work['title_zh']}", False),
            (f"Canonical text · {period}", False),
            (f"{work['n_files']} file · {thousands(work['chars'])} characters", False),
        ],
        [
            ("Source file", True),
            (d.fc_file["relative_path"], False),
            (f"SHA-256 {fhash[:8]}…{fhash[-8:]}", False),
            ("Matches SHA256SUMS.txt", False),
        ],
        [
            ("Upstream", True),
            ("Database of Chinese", False),
            ("Medical Classics", False),
            (repo, False),
        ],
    ]
    for (x, w), items, ec in zip(boxes, content, [BLACK, GREY, GREY, GREY]):
        rounded_box(ax, x, y0, w, h, ec=ec)
        top_line = y0 + h / 2 - 1.3 * (len(items) - 1)
        for i, (s, bold) in enumerate(items):
            cv.text(x + 2.0, top_line + 2.6 * i, s, PT_S, ha="left", fontweight="bold" if bold else "normal")
    keys = ["source_id", "file manifest", "provenance"]
    for (x0, w0), (x1, _), key in zip(boxes, boxes[1:], keys):
        ym = y0 + h / 2
        arrow(ax, (x0 + w0, ym), (x1, ym))
        cv.text((x0 + w0 + x1) / 2, ym - 1.7, key, PT_XS, ha="center")
    return cv


# ---------------------------------------------------------------------------
# Fig. 2 — composition
# ---------------------------------------------------------------------------


def work_badge(d, sid: str) -> tuple[str, str]:
    if sid in CANON_WORKS:
        return CANON_WORKS[sid][0], BLACK
    if sid in VARIANT_WORKS:
        return VARIANT_WORKS[sid][0], VERMILLION
    return str(d.comm_ids.index(sid) + 1), BLUE


def fig2(d) -> Canvas:
    cv = Canvas(128.0)
    cv.panel("a", 0, 0)

    # --- a: works by period (swarm) with period totals beneath
    ax_x, ax_y, ax_w, ax_h = 13.0, 5.0, 96.0, 40.0
    ax = cv.axes(ax_x, ax_y, ax_w, ax_h)
    ymin, ymax = 3.0, 6.0
    mm_x = ax_w / len(PERIODS)
    mm_y = ax_h / (ymax - ymin)
    big, small = 2.6, 1.45
    for col, (key, _, _) in enumerate(PERIODS):
        members = [w for w in d.works if w["dynasty"] == key]
        y = [(math.log10(w["chars"]) - ymin) * mm_y for w in members]
        dia = [big if d.role[w["source_id"]] != "other" else small for w in members]
        offsets = swarm(y, dia)
        for w, off, di in zip(members, offsets, dia):
            xx = col + off / mm_x
            yy = math.log10(w["chars"])
            if di == small:
                ax.scatter([xx], [yy], s=(di * 72 / 25.4) ** 2, c=GREY, lw=0, zorder=2)
            else:
                label, colour = work_badge(d, w["source_id"])
                ax.scatter([xx], [yy], s=(di * 72 / 25.4) ** 2, c=colour, lw=0, zorder=3)
                ax.text(xx, yy - CAP_DROP_MM / mm_y, label, fontsize=PT_XS, fontweight="bold", color=WHITE, ha="center", va="center", zorder=4)
        ax.text(col, ymax - 0.04, f"n = {len(members)}", fontsize=PT_XS, ha="center", va="top")
    ax.set_xlim(-0.5, len(PERIODS) - 0.5)
    ax.set_ylim(ymin, ymax)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.set_yticks([3, 4, 5, 6])
    ax.set_yticklabels(["1", "10", "100", "1,000"])
    ax.set_yticks([math.log10(k * 10**e) for e in (3, 4, 5) for k in range(2, 10)], minor=True)
    ax.set_ylabel("Characters per work (thousands)")

    bx = cv.axes(ax_x, ax_y + ax_h + 3.0, ax_w, 9.0)
    totals = [sum(w["chars"] for w in d.works if w["dynasty"] == key) / 1e6 for key, _, _ in PERIODS]
    bx.bar(range(len(PERIODS)), totals, width=0.5, color=GREY, lw=0)
    for i, t in enumerate(totals):
        bx.text(i, t + 0.12, f"{t:.2f}", fontsize=PT_XS, ha="center", va="bottom")
    bx.set_xlim(-0.5, len(PERIODS) - 0.5)
    bx.set_ylim(0, max(totals) * 1.32)
    bx.set_yticks([])
    bx.spines["left"].set_visible(False)
    bx.set_xticks(range(len(PERIODS)))
    bx.set_xticklabels([f"{label}\n{dates}" if dates else label for _, label, dates in PERIODS], linespacing=1.15)
    bx.tick_params(axis="x", length=0, pad=2.0)
    cv.text(ax_x - 1.0, ax_y + ax_h + 3.0 + 3.2, "Characters", PT_XS, ha="right")
    cv.text(ax_x - 1.0, ax_y + ax_h + 3.0 + 5.6, "(millions)", PT_XS, ha="right")

    # key
    kx, ky, step = 116.0, 6.0, 2.85
    rows: list[tuple] = [("head", "Canonical text")]
    rows += [("item", sid, f"{CANON_WORKS[sid][2]} {CANON_WORKS[sid][1]}") for sid in ("SHSRC0033", "SHSRC0035")]
    rows += [("head", "Variant witnesses")]
    rows += [("item", sid, f"{VARIANT_WORKS[sid][2]} {VARIANT_WORKS[sid][1]}") for sid in d.var_ids]
    rows += [("head", "Clause-aligned commentaries")]
    rows += [("item", sid, f"{author}, {title} {zh}") for sid, zh, _, title, author in COMMENTARY_WORKS]
    rows += [("head", "Other catalogued works"), ("other", f"{d.n_role['other']} works")]
    y = ky
    for row in rows:
        if row[0] == "head":
            y += 0.9 if y > ky else 0
            cv.text(kx, y, row[1], PT_S, ha="left", fontweight="bold")
        elif row[0] == "item":
            label, colour = work_badge(d, row[1])
            badge(cv.mm, kx + 1.3, y, label, colour)
            cv.text(kx + 3.6, y, row[2], PT_S, ha="left")
        else:
            cv.mm.add_patch(Circle((kx + 1.3, y), small / 2, fc=GREY, ec="none"))
            cv.text(kx + 3.6, y, row[1], PT_S, ha="left")
        y += step

    # --- b: annotation fields of the canonical clauses, by section
    cv.panel("b", 0, 70.0)
    fields = [(key, label) for _, group in FIELD_GROUPS for key, label in group]
    groups = [(g, len(f)) for g, f in FIELD_GROUPS]
    rows_b = [(s.long, s.zh, f"{s.first}–{s.last}", [c for c in d.canon if s.first <= c["canonical_clause_no"] <= s.last]) for s in d.sections]
    rows_b.append(("All canonical clauses", "", f"1–{d.n_canon}", d.canon))
    cell_w, cell_h = 6.6, 3.2
    hx, hy = 70.0, 86.0
    heat = cv.axes(hx, hy, cell_w * len(fields), cell_h * len(rows_b) + 0.8)
    cmap = LinearSegmentedColormap.from_list("white_grey", [WHITE, "#7F7F7F"])
    for r, (_, _, _, members) in enumerate(rows_b):
        y0 = r * cell_h + (0.8 if r == len(rows_b) - 1 else 0)
        for k, (key, _) in enumerate(fields):
            pct = 100 * sum(bool(c[key]) for c in members) / len(members)
            heat.add_patch(Rectangle((k, y0), 1, cell_h, fc=cmap(pct / 100), ec=WHITE, lw=0.5))
            heat.text(k + 0.5, y0 + cell_h / 2 + 0.05, f"{pct:.0f}", fontsize=PT_XS, ha="center", va="center")
    heat.set_xlim(0, len(fields))
    heat.set_ylim(cell_h * len(rows_b) + 0.8, 0)
    heat.set_axis_off()
    for k, (_, label) in enumerate(fields):
        cv.text(hx + (k + 0.5) * cell_w - 0.6, hy - 1.0, label, PT_S, ha="left", va="bottom", rotation=40, rotation_mode="anchor")
    k0 = 0
    for g, n in groups:
        xa, xb = hx + k0 * cell_w + 0.6, hx + (k0 + n) * cell_w - 0.6
        yb = hy + cell_h * len(rows_b) + 0.8 + 1.4
        cv.mm.plot([xa, xb], [yb, yb], color=BLACK, lw=LW_THIN)
        cv.text((xa + xb) / 2, yb + 1.9, g, PT_S, ha="center")
        k0 += n

    # row labels and clause counts
    nx, nw = 55.0, 12.0
    nbar = cv.axes(nx, hy, nw, cell_h * len(rows_b) + 0.8)
    for r, (label, zh, span, members) in enumerate(rows_b):
        y0 = r * cell_h + (0.8 if r == len(rows_b) - 1 else 0) + cell_h / 2
        if r < len(rows_b) - 1:  # the total is printed, not drawn: its bar would not fit the scale
            nbar.barh(y0, len(members), height=cell_h * 0.62, color=BLACK, lw=0)
            nbar.text(len(members) + 4, y0 + 0.05, str(len(members)), fontsize=PT_XS, ha="left", va="center")
        else:
            nbar.text(0, y0 + 0.05, str(len(members)), fontsize=PT_XS, ha="left", va="center")
        cv.text(1.5, hy + y0, label, PT_S, ha="left")
        cv.text(28.5, hy + y0, zh, PT_S, ha="left")
        cv.text(53.0, hy + y0, span, PT_S, ha="right")
    nbar.set_xlim(0, max(len(m) for *_, m in rows_b[:-1]) * 1.45)
    nbar.set_ylim(cell_h * len(rows_b) + 0.8, 0)
    nbar.set_axis_off()
    cv.text(nx, hy - 2.0, "Clauses", PT_S, ha="left", fontweight="bold")
    cv.text(1.5, hy - 2.0, "Section", PT_S, ha="left", fontweight="bold")
    cv.text(53.0, hy - 2.0, "Numbers", PT_S, ha="right", fontweight="bold")

    # colour scale
    sx, sy, sh = hx + cell_w * len(fields) + 3.0, hy + 2.0, 20.0
    scale = cv.axes(sx, sy, 2.2, sh)
    for k in range(100):  # vector steps, so the PDF carries no embedded image
        scale.add_patch(Rectangle((0, k), 1, 1.02, fc=cmap((k + 0.5) / 100), lw=0))
    scale.set_xlim(0, 1)
    scale.set_ylim(0, 100)
    scale.set_xticks([])
    scale.yaxis.tick_right()
    scale.set_yticks([0, 50, 100])
    scale.tick_params(axis="y", labelsize=PT_XS, length=1.5, pad=1.0)
    for side in ("left", "top", "bottom"):
        scale.spines[side].set_visible(False)
    scale.spines["right"].set_visible(True)
    cv.text(WIDTH_MM - 1.0, sy - 2.2, "% clauses", PT_XS, ha="right")
    return cv


# ---------------------------------------------------------------------------
# Fig. 3 — record structure and linkage
# ---------------------------------------------------------------------------


def entity(cv, x, y, w, title, n, source, fields, colour, z=2.0):
    ax = cv.mm
    head_h, line = 5.6, 2.45
    h = head_h + 0.9 + line * len(fields) + 0.6
    outer = rounded_box(ax, x, y, w, h, ec="none", fc=WHITE, z=z)
    head = Rectangle((x, y), w, head_h, fc=tint(colour, 0.14 if colour != BLACK else 0.10), ec="none", zorder=z + 0.1)
    head.set_clip_path(outer)
    ax.add_patch(head)
    rounded_box(ax, x, y, w, h, ec=colour, fc="none", z=z + 0.3)
    ax.plot([x, x + w], [y + head_h, y + head_h], color=colour, lw=LW_THIN, zorder=z + 0.2)
    cv.text(x + 1.5, y + 1.9, title, PT, ha="left", fontweight="bold", zorder=z + 0.4)
    cv.text(x + w - 1.5, y + 1.9, thousands(n), PT, ha="right", fontweight="bold", zorder=z + 0.4)
    cv.text(x + 1.5, y + 4.1, source, PT_XS, ha="left", zorder=z + 0.4)
    for i, f in enumerate(fields):
        cv.text(x + 1.5, y + head_h + 0.9 + line * (i + 0.5), f, PT_S, ha="left", zorder=z + 0.4)
    return SimpleNamespace(x=x, y=y, w=w, h=h, cx=x + w / 2, cy=y + h / 2, r=x + w, b=y + h)


def wrap_han(text: str, shortest: int = 9, longest: int = 15) -> list[str]:
    """Break Han text at phrase punctuation once a line holds `shortest`
    characters, and hard-break at `longest`; no line starts with punctuation."""
    punct = "，。、；：？！」』）"
    lines, line = [], ""
    for ch in text:
        if len(line) >= longest and ch not in punct:
            lines.append(line)
            line = ""
        line += ch
        if ch in punct and len(line) >= shortest:
            lines.append(line)
            line = ""
    return lines + ([line] if line else [])


def fig3(d) -> Canvas:
    cv = Canvas(136.0)
    ax = cv.mm
    cv.panel("a", 0, 0)

    n_types = len(d.relation_counts)
    rel = entity(
        cv, 1.5, 6.0, 36.0, "Relation", len(d.relations), "06_relations/relations",
        ["relation_id", "source_node_id", "target_node_id", f"relation_type ({n_types} types)"], GREY,
    )
    node = entity(
        cv, 1.5, rel.b + 10.0, 36.0, "Node", len(d.nodes), "06_relations/nodes",
        ["node_id, node_type", "source_id, clause_id", "label, resolvable",
         f"= unified record ({thousands(len(d.unified))})"], GREY,
    )
    cx, cw = 86.0, 43.0
    com = entity(
        cv, cx, 3.0, cw, "Commentary record", len(d.comms), "04_commentaries",
        ["commentary_id", "clause_id → clause", "source_id → work", "commentator, commentary_text", "alignment_similarity"], BLUE,
    )
    cla = entity(
        cv, cx, com.b + 4.4, cw, "Clause", len(d.clauses), "03_clauses",
        ["clause_id, source_id → work", f"canonical_clause_no (1–{d.n_canon})", "six_channel, original_text",
         f"{sum(len(f) for _, f in FIELD_GROUPS)} annotation fields, sha256"], BLACK,
    )
    var = entity(
        cv, cx, cla.b + 4.4, cw, "Variant reading", len(d.variants), "05_textual_variants",
        ["variant_id", "clause_id → clause", "source_id → work", "base_text, variant_text, similarity"], VERMILLION,
    )
    wx, ww = 140.0, 41.5
    wrk = entity(
        cv, wx, 12.0, ww, "Catalogued work", len(d.works), "01_source_catalog",
        ["source_id", "title_zh, author, dynasty", "work_type, evidence_layer", "edition, source_provenance"], GREY,
    )
    fil = entity(
        cv, wx, wrk.b + 9.0, ww, "Source text file", len(d.manifest), "02_source_texts",
        ["file_id, source_id → work", "relative_path", "sha256, characters"], GREY,
    )

    # relation endpoints are nodes; a node is one clause, commentary or variant record
    arrow(ax, (rel.cx, rel.b), (rel.cx, node.y))
    cv.text(rel.cx + 1.5, (rel.b + node.y) / 2 - 1.2, "source_node_id,", PT_XS, ha="left")
    cv.text(rel.cx + 1.5, (rel.b + node.y) / 2 + 1.2, "target_node_id", PT_XS, ha="left")
    for target in (com, cla, var):
        arrow(ax, (node.r, node.cy), (target.x, target.cy))
    cv.text((node.r + cx) / 2 + 4.0, node.cy + (cla.cy - node.cy) / 2 + 1.6, "node_id = record id", PT_XS, ha="center")
    # foreign keys to the clause
    arrow(ax, (cx + cw * 0.5, com.b), (cx + cw * 0.5, cla.y))
    cv.text(cx + cw * 0.5 + 1.0, (com.b + cla.y) / 2, "clause_id", PT_XS, ha="left")
    arrow(ax, (cx + cw * 0.5, var.y), (cx + cw * 0.5, cla.b))
    cv.text(cx + cw * 0.5 + 1.0, (var.y + cla.b) / 2, "clause_id", PT_XS, ha="left")
    # foreign keys to the work
    for target in (com, cla, var):
        arrow(ax, (target.r, target.cy), (wrk.x, wrk.cy))
    cv.text(wrk.x - 1.0, wrk.y - 1.0, "source_id", PT_XS, ha="right", va="bottom")
    arrow(ax, (wrk.cx, fil.y), (wrk.cx, wrk.b))
    cv.text(wrk.cx + 1.0, (wrk.b + fil.y) / 2, "source_id", PT_XS, ha="left")

    # --- b: relation types (a dot plot: bar length means nothing on a log axis)
    cv.panel("b", 0, 75.0)
    order = [t for t, _ in d.relation_counts.most_common()]
    colour_of = {"commentary": BLUE, "variant": VERMILLION, "clause": BLACK}
    py, ph = 80.0, 44.0
    bx = cv.axes(33.0, py, 26.0, ph)
    for i, t in enumerate(order):
        (target,) = d.relation_target[t]
        n = d.relation_counts[t]
        bx.scatter([n], [i], s=11, c=colour_of[target], lw=0, zorder=3)
        bx.text(n * 1.6, i, thousands(n), fontsize=PT_XS, va="center", ha="left")
        cv.text(31.5, py + ph * (i + 0.5) / len(order), RELATION_LABELS[t], PT_S, ha="right")
    bx.set_xscale("log")
    bx.set_xlim(0.6, 1e4)
    bx.set_ylim(len(order) - 0.5, -0.5)
    bx.set_yticks([])
    bx.spines["left"].set_visible(False)
    bx.set_xticks([1, 10, 100, 1000])
    bx.set_xticklabels(["1", "10", "100", "1,000"])
    bx.xaxis.set_minor_locator(LogLocator(base=10, subs=range(2, 10)))
    bx.xaxis.set_minor_formatter(NullFormatter())
    bx.set_xlabel("Edges")
    kx = 12.0
    cv.text(kx, 78.2, "Target record:", PT_XS, ha="left")
    kx += 13.2
    for label, colour in (("commentary", BLUE), ("variant", VERMILLION), ("clause", BLACK)):
        ax.add_patch(Circle((kx, 78.2), 0.65, fc=colour, ec="none"))
        cv.text(kx + 1.2, 78.2, label, PT_XS, ha="left")
        kx += 1.2 + {"commentary": 11.8, "variant": 8.2, "clause": 7.0}[label]

    # --- c: the featured clause and everything linked to it
    cv.panel("c", 66.0, 75.0)
    c = d.fc
    bx0, by0, bw, bh = 110.0, 90.0, 36.0, 25.0
    rounded_box(ax, bx0, by0, bw, bh, ec=BLACK, fc=tint(BLACK, 0.06), z=3)
    section = next(s for s in d.sections if s.first <= FEATURED_CLAUSE <= s.last)
    cv.text(bx0 + 2.0, by0 + 3.0, f"Clause {FEATURED_CLAUSE}", PT, ha="left", fontweight="bold", zorder=4)
    cv.text(bx0 + 2.0, by0 + 5.6, f"{section.short} · {c['clause_id']}", PT_XS, ha="left", zorder=4)
    text = c["original_text"]
    first = text[: text.index("。") + 1]
    tail = text[text.rindex("，") + 1 :]
    for i, line in enumerate(wrap_han(first) + ["……" + tail]):
        cv.text(bx0 + 2.0, by0 + 9.2 + 2.55 * i, line, PT_S, ha="left", zorder=4)
    cv.text(bx0 + 2.0, by0 + bh - 2.4, f"Formula: {FEATURED_FORMULA[1]}", PT_XS, ha="left", zorder=4)

    # commentary records: one row per work, in order of composition
    anchor = (bx0, by0 + bh / 2)
    per_work = Counter(x["source_id"] for x in d.fc_comms)
    cv.text(66.5, 79.0, f"Commentary records ({len(d.fc_comms)})", PT_S, ha="left", fontweight="bold")
    ys = np.linspace(83.5, 129.5, len(d.comm_ids))
    for i, (sid, _, _, title, _) in enumerate(COMMENTARY_WORKS):
        yy = ys[i]
        badge(ax, 67.8, yy, str(i + 1), BLUE, d=2.4)
        cv.text(69.8, yy, title, PT_S, ha="left")
        k = per_work.get(sid, 0)
        if k == 0:  # the work has no record for this clause
            ax.add_patch(Circle((100.0, yy), 0.8, fc=WHITE, ec=GREY, lw=LW_THIN, zorder=3))
            continue
        for j in range(k):
            px = 100.0 + j * 2.1
            ax.plot([px, anchor[0]], [yy, anchor[1]], color=BLUE, lw=LW_THIN, zorder=1)
            ax.add_patch(Circle((px, yy), 0.8, fc=BLUE, ec="none", zorder=3))

    # variant readings and clause-to-clause relations, one column on the right
    nx_, step = 155.0, 3.1
    yy = 79.0
    cv.text(nx_ - 3.0, yy, f"Variant readings ({len(d.fc_vars)})", PT_S, ha="left", fontweight="bold")
    yy += 3.6
    anchor_v = (bx0 + bw, by0 + 2.5)
    for v in sorted(d.fc_vars, key=lambda v: d.var_ids.index(v["source_id"])):
        ax.plot([anchor_v[0], nx_], [anchor_v[1], yy], color=VERMILLION, lw=LW_THIN, zorder=1)
        badge(ax, nx_, yy, VARIANT_WORKS[v["source_id"]][0], VERMILLION, d=2.4)
        cv.text(nx_ + 2.0, yy, f"{VARIANT_WORKS[v['source_id']][3]} ({v['similarity']:.2f})", PT_S, ha="left")
        yy += step
    groups = [(t, sorted(d.fc_links[t])) for t in RELATION_LABELS if d.fc_links.get(t)]
    for t, targets in groups:
        yy += 1.0
        cv.text(nx_ - 3.0, yy, f"{RELATION_LABELS[t]} ({len(targets)})", PT_S, ha="left", fontweight="bold")
        yy += 3.6
        anchor_c = (bx0 + bw, by0 + bh * (0.45 if t == "sequence" else 0.8))
        for n in targets:
            ax.plot([anchor_c[0], nx_], [anchor_c[1], yy], color=GREY, lw=LW_THIN, zorder=1,
                    ls="-" if t == "sequence" else (0, (2.2, 1.4)))
            ax.add_patch(Circle((nx_, yy), 0.8, fc=BLACK, ec="none", zorder=3))
            cv.text(nx_ + 1.6, yy, f"Clause {n}", PT_S, ha="left")
            yy += step
    return cv


# ---------------------------------------------------------------------------
# Fig. 4 — coverage and technical validation
# ---------------------------------------------------------------------------


def fig4(d) -> Canvas:
    cv = Canvas(124.0)
    ax = cv.mm
    cv.panel("a", 0, 0)
    n = d.n_canon
    mx, mw = 45.0, 126.0
    row_h, cell = 2.55, 2.05
    # section band
    band = cv.axes(mx, 10.5, mw, 2.0)
    for k, s in enumerate(d.sections):
        band.add_patch(Rectangle((s.first - 0.5, 0), s.n, 1, fc="#BDBDBD" if k % 2 == 0 else "#E3E3E3", lw=0))
        band.text((s.first + s.last) / 2, 1.35, s.short, fontsize=PT_XS, rotation=60, ha="left", va="bottom", rotation_mode="anchor")
    band.set_xlim(0.5, n + 0.5)
    band.set_ylim(0, 1)
    band.set_axis_off()

    rows = [(sid, BLUE, d.covered[sid]) for sid in d.comm_ids] + [(sid, VERMILLION, d.var_covered[sid]) for sid in d.var_ids]
    split = 1.1
    mh = row_h * len(rows) + split
    mat = cv.axes(mx, 13.5, mw, mh)
    for r, (sid, colour, covered) in enumerate(rows):
        y0 = r * row_h + (split if r >= len(d.comm_ids) else 0)
        mat.add_patch(Rectangle((0.5, y0), n, cell, fc="#EDEDED", lw=0, zorder=1))
        runs, start = [], None
        for k in range(1, n + 2):
            if k <= n and k in covered:
                start = k if start is None else start
            elif start is not None:
                runs.append((start - 0.5, k - start))
                start = None
        mat.broken_barh(runs, (y0, cell), facecolors=colour, lw=0, zorder=2)
        label, badge_colour = work_badge(d, sid)
        yc = 13.5 + y0 + cell / 2
        badge(ax, 2.6, yc, label, badge_colour, d=2.2)
        title = COMMENTARY_WORKS[d.comm_ids.index(sid)][3] if sid in d.comm_ids else VARIANT_WORKS[sid][3]
        cv.text(4.6, yc, title, PT_S, ha="left")
        cv.text(mx + mw + 1.2, yc, str(len(covered)), PT_XS, ha="left")
    mat.set_xlim(0.5, n + 0.5)
    mat.set_ylim(mh, 0)
    mat.set_axis_off()
    cv.text(mx + mw + 1.2, 11.9, "n", PT_XS, ha="left")

    # works per clause
    wy = 13.5 + mh + 2.2
    wx = cv.axes(mx, wy, mw, 11.0)
    wx.bar(range(1, n + 1), d.works_per_clause, width=1.0, color=BLUE, lw=0)
    wx.set_xlim(0.5, n + 0.5)
    wx.set_ylim(0, len(d.comm_ids))
    wx.set_yticks([0, 3, 6, 9])
    ticks = [1] + list(range(50, n, 50)) + [n]
    wx.set_xticks(ticks)
    wx.set_xlabel("Canonical clause number")
    cv.text(mx - 7.0, wy + 5.5, "Commentaries", PT_S, ha="right")
    cv.text(mx - 7.0, wy + 7.9, "per clause", PT_S, ha="right")

    # --- b: alignment scores per commentary work
    cv.panel("b", 0, 72.0)
    rng = np.random.default_rng(0)
    lo = math.floor(min(min(v) for v in list(d.scores.values()) + list(d.var_sims.values())) * 10) / 10
    ticks = [round(lo + 0.1 * k, 1) for k in range(int(round((1.0 - lo) / 0.1)) + 1)]

    def strip(axx, data, colour):
        for i, values in enumerate(data):
            jitter = rng.uniform(-0.3, 0.3, len(values))
            axx.scatter(values, i + jitter, s=1.1, c=[tint(colour, 0.55)], lw=0, zorder=1, rasterized=False)
        axx.boxplot(
            data,
            positions=range(len(data)),
            orientation="horizontal",
            widths=0.58,
            whis=1.5,
            showfliers=False,
            patch_artist=True,
            boxprops=dict(facecolor="none", edgecolor=BLACK, lw=LW_AXIS),
            whiskerprops=dict(color=BLACK, lw=LW_AXIS),
            capprops=dict(color=BLACK, lw=LW_AXIS),
            medianprops=dict(color=BLACK, lw=LW_DATA, solid_capstyle="butt"),
        )
        axx.set_ylim(len(data) - 0.5, -0.5)
        axx.set_xlim(lo, 1.01)
        axx.set_yticks([])
        axx.spines["left"].set_visible(False)
        axx.set_xticks(ticks)
        axx.set_xticklabels([f"{t:.1f}" for t in ticks])

    by, bh = 76.0, 38.0
    b_ax = cv.axes(mx, by, 70.0, bh)
    strip(b_ax, [d.scores[sid] for sid in d.comm_ids], BLUE)
    b_ax.set_xlabel("Alignment score")
    for i, sid in enumerate(d.comm_ids):
        yc = by + bh * (i + 0.5) / len(d.comm_ids)
        badge(ax, 2.6, yc, str(i + 1), BLUE, d=2.2)
        cv.text(4.6, yc, COMMENTARY_WORKS[i][3], PT_S, ha="left")
        cv.text(mx + 70.0 + 1.2, yc, str(len(d.scores[sid])), PT_XS, ha="left")
    cv.text(mx + 70.0 + 1.2, by - 1.6, "n", PT_XS, ha="left")

    # --- c: variant witnesses against the canonical clause
    cv.panel("c", 124.0, 72.0)
    c_ax = cv.axes(150.0, by, 31.0, bh)
    strip(c_ax, [d.var_sims[sid] for sid in d.var_ids], VERMILLION)
    c_ax.set_xlabel("Similarity to clause")
    for i, sid in enumerate(d.var_ids):
        yc = by + bh * (i + 0.5) / len(d.var_ids)
        label, _ = work_badge(d, sid)
        badge(ax, 128.6, yc - 2.6, label, VERMILLION, d=2.2)
        cv.text(130.6, yc - 2.6, VARIANT_WORKS[sid][3], PT_S, ha="left")
        cv.text(130.6, yc + 0.2, f"n = {len(d.var_sims[sid])}", PT_XS, ha="left")
        same = sum(s == 1.0 for s in d.var_sims[sid])
        cv.text(130.6, yc + 2.6, f"{same} identical", PT_XS, ha="left")
    return cv


# ---------------------------------------------------------------------------
# Audit and output
# ---------------------------------------------------------------------------


def cmap_of(path: str, index: int | None = None) -> set[int]:
    font = TTCollection(path).fonts[index or 0] if path.lower().endswith(".ttc") else TTFont(path)
    return set(font["cmap"].getBestCmap())


def is_han(ch: str) -> bool:
    o = ord(ch)
    return 0x3000 <= o <= 0x303F or 0x3400 <= o <= 0x9FFF or 0xFF00 <= o <= 0xFFEF or 0xF900 <= o <= 0xFAFF


def rendered_texts(fig) -> list[Text]:
    """Every Text that reaches the page: figure texts, axes texts, and the
    labels of axes that are switched on."""
    out = [t for t in fig.texts]
    for ax in fig.axes:
        out += list(ax.texts)
        if ax.axison:
            for axis in (ax.xaxis, ax.yaxis):
                for tick in axis._update_ticks():  # the ticks that are actually drawn
                    out += [lab for lab in (tick.label1, tick.label2) if lab.get_visible()]
                out.append(axis.label)
    return [t for t in out if t.get_visible() and t.get_text().strip()]


def audit(fig, fonts) -> list[str]:
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    problems = []
    latin = cmap_of(font_manager.findfont(fonts.latin, fallback_to_default=False))
    cjk_path = font_manager.findfont(fonts.cjk, fallback_to_default=False)
    cjk = cmap_of(cjk_path)
    texts = rendered_texts(fig)
    W, H = fig.bbox.width, fig.bbox.height
    boxes = []
    for t in texts:
        s, size = t.get_text(), t.get_fontsize()
        if t.get_gid() == "panel-label":
            if size != PT_PANEL or t.get_fontweight() not in ("bold", 700) or s != s.lower():
                problems.append(f"panel label {s!r} is not 8 pt bold lowercase")
        elif not 5.0 - 1e-9 <= size <= 7.0 + 1e-9:
            problems.append(f"text {s[:24]!r} is {size:g} pt")
        colour = to_hex(t.get_color())
        if colour not in ("#000000", "#ffffff"):
            problems.append(f"text {s[:24]!r} is coloured {colour}")
        for ch in s:
            if ch.isspace():
                continue
            if ord(ch) not in latin and not (is_han(ch) and ord(ch) in cjk):
                problems.append(f"glyph {ch!r} in {s[:24]!r} is in neither font")
            if ord(ch) not in latin and not is_han(ch):
                problems.append(f"non-Han glyph {ch!r} would fall back to the CJK face")
        bb = t.get_window_extent(renderer)
        if bb.x0 < -0.5 or bb.y0 < -0.5 or bb.x1 > W + 0.5 or bb.y1 > H + 0.5:
            problems.append(f"text {s[:24]!r} runs off the page")
        boxes.append((t, bb))
    # text-on-text collisions (rotated labels are checked by eye: their boxes are not their ink)
    tol = 0.35 / 25.4 * fig.dpi  # 0.35 mm
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            (ta, a), (tb, b) = boxes[i], boxes[j]
            if ta.get_rotation() or tb.get_rotation():
                continue
            ox = min(a.x1, b.x1) - max(a.x0, b.x0)
            oy = min(a.y1, b.y1) - max(a.y0, b.y0)
            if ox > tol and oy > tol:
                problems.append(f"text {ta.get_text()[:20]!r} overlaps {tb.get_text()[:20]!r}")

    def stroke(obj, lw, what):
        if lw > 0 and not 0.25 - 1e-9 <= lw <= 1.0 + 1e-9:
            problems.append(f"{what} {type(obj).__name__} stroke {lw:g} pt")

    for obj in fig.findobj():
        if not getattr(obj, "get_visible", lambda: True)():
            continue
        if isinstance(obj, Line2D):
            if obj.get_linestyle() not in ("None", "", " ") and obj.get_alpha() != 0:
                stroke(obj, obj.get_linewidth(), "line")
            if obj.get_marker() not in (None, "None", "", " "):
                stroke(obj, obj.get_markeredgewidth(), "marker")
        elif isinstance(obj, Patch) and obj is not fig.patch:
            if obj.get_edgecolor()[3] > 0:
                stroke(obj, obj.get_linewidth(), "patch")
        elif isinstance(obj, Collection):
            edges = obj.get_edgecolors()
            for k, lw in enumerate(np.atleast_1d(obj.get_linewidths())):
                if len(edges) and edges[k % len(edges)][3] > 0:
                    stroke(obj, float(lw), "collection")
    return sorted(set(problems))


def save(cv: Canvas, name: str, fonts) -> dict:
    problems = audit(cv.fig, fonts)
    if problems:
        print(f"{name}: {len(problems)} problem(s)")
        for p in problems:
            print("  -", p)
        if "--draft" not in sys.argv:
            sys.exit(1)
    OUT.mkdir(exist_ok=True)
    pdf, png = OUT / f"{name}.pdf", OUT / f"{name}.png"
    cv.fig.savefig(pdf, metadata={"Creator": "scripts/make_figures.py", "Producer": None, "CreationDate": None})
    raw = OUT / f"{name}.rgba.png"
    cv.fig.savefig(raw, dpi=DPI)
    plt.close(cv.fig)
    with Image.open(raw) as im:
        flat = Image.new("RGB", im.size, WHITE)
        flat.paste(im, mask=im.getchannel("A"))
    flat.save(png, dpi=(DPI, DPI), optimize=True)
    raw.unlink()

    # measure what was actually written
    data = pdf.read_bytes()
    box = re.search(rb"/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]", data)
    w_mm, h_mm = (float(v) / 72 * 25.4 for v in box.groups())
    fonts_used = sorted({m.decode() for m in re.findall(rb"/BaseFont\s*/([A-Za-z0-9+\-,]+)", data)})
    with Image.open(png) as im:
        px, dpi = im.size, im.info.get("dpi")
    report = {
        "name": name,
        "pdf_mm": (round(w_mm, 2), round(h_mm, 2)),
        "png_px": px,
        "png_dpi": tuple(round(v) for v in dpi) if dpi else None,
        "fonts": fonts_used,
        "type3": b"/Type3" in data,
        "truetype_embedded": b"/FontFile2" in data,
    }
    if abs(w_mm - WIDTH_MM) > 0.05 or h_mm > MAX_HEIGHT_MM + 0.05:
        sys.exit(f"{name}: page is {w_mm:.2f} × {h_mm:.2f} mm")
    # an integer pixel count cannot hit 183 mm exactly; one pixel is 0.03 mm
    if abs(px[0] - WIDTH_MM * MM * DPI) > 1 or report["png_dpi"] != (DPI, DPI):
        sys.exit(f"{name}: PNG is {px} at {dpi} dpi")
    if report["type3"] or not report["truetype_embedded"]:
        sys.exit(f"{name}: fonts are not embedded as TrueType")
    return report


# ---------------------------------------------------------------------------
# Legends — the prose is fixed, every number is read from the data
# ---------------------------------------------------------------------------


def pct(a: int, b: int) -> str:
    return f"{100 * a / b:.1f}%"


def legends(d) -> list[tuple[str, str]]:
    n_chars = sum(w["chars"] for w in d.works)
    present = [label for key, label, _ in PERIODS if key != "not_stated_in_source" and any(w["dynasty"] == key for w in d.works)]
    n_aux = len(d.clauses) - d.n_canon
    prov = d.validation["provenance_resolution"]
    traced = sum(prov[k]["resolved_to_source_files"] for k in prov)
    records = sum(prov[k]["records"] for k in prov)
    n_layers = len(d.schema["files"])
    n_pass = sum(f["status"] == "PASS" for f in d.schema["files"].values())
    work33 = d.work[d.fc["source_id"]]
    fields = sum(len(f) for _, f in FIELD_GROUPS)
    covered_any = d.n_canon - len(d.uncovered)
    var_any = len(set().union(*d.var_covered.values()))
    med_wpc = median(d.works_per_clause)
    meds = {sid: median(v) for sid, v in d.scores.items()}
    lo_sid, hi_sid = min(meds, key=meds.get), max(meds, key=meds.get)
    fc_works = len({x["source_id"] for x in d.fc_comms})
    missing = [COMMENTARY_WORKS[i][3] for i, sid in enumerate(d.comm_ids) if sid not in {x["source_id"] for x in d.fc_comms}]
    g, q = d.var_ids
    same = {sid: sum(v == 1.0 for v in d.var_sims[sid]) for sid in d.var_ids}
    words = {1: "one", 2: "two", 6: "six", 8: "eight", 9: "nine"}
    dup = d.validation["schema_validation"]["duplicate_identifiers"]
    orphans = d.validation["structural_consistency"]["orphan_relation_endpoints"]

    def of(k: int, n: int, noun: str) -> str:
        """'all 425 files' when every one passes, '424 of 425 files' otherwise."""
        return f"all {words.get(n, thousands(n))} {noun}" if k == n else f"{thousands(k)} of {thousands(n)} {noun}"

    def none_or(k: int, noun: str) -> str:
        return f"no {noun}" if k == 0 else f"{k} {noun}"

    fig1 = (
        f"**Fig. 1 | Construction and provenance of the corpus.** "
        f"**a**, Construction workflow. The {len(d.works)} catalogued historical works ({thousands(len(d.manifest))} "
        f"plain-text files, {n_chars / 1e6:.2f} million characters, {present[0]} to {present[-1]}) were retrieved from "
        f"the Database of Chinese Medical Classics (jicheng.tw) and assigned an evidence role. The {words[d.n_role['canon']]} "
        f"canonical texts were segmented into {thousands(len(d.clauses))} clause records ({d.n_canon} numbered canonical "
        f"clauses and {n_aux} auxiliary clauses), and the {words[d.n_role['variant']]} variant editions and "
        f"{words[d.n_role['commentary']]} commentaries were aligned to the canonical clauses ({thousands(len(d.variants))} "
        f"variant readings and {thousands(len(d.comms))} commentary records). The other {d.n_role['other']} works are "
        f"catalogued and released as full text but are not aligned in this release. The clause, commentary and variant "
        f"records are the {thousands(len(d.nodes))} nodes of a relation graph with {thousands(len(d.relations))} typed "
        f"edges in {words[len(d.relation_counts)]} relation types, and are also released as {thousands(len(d.unified))} "
        f"unified text records. Validation: {of(n_pass, n_layers, 'structured layers')} pass schema validation, with "
        f"{none_or(dup, 'duplicate identifiers')} and {none_or(orphans, 'orphan edge endpoints')}; "
        f"{of(traced, records, 'records')} trace to a catalogued work and a source file; and "
        f"{of(d.integrity['hash_match'], d.integrity['files_in_manifest'], 'files')} match their SHA-256 checksums. "
        f"Outline colours are used in all figures: black, canonical text; vermillion, variant witnesses; blue, "
        f"commentaries; grey, other material (dashed where not aligned). "
        f"**b**, Provenance chain of one record, canonical clause {FEATURED_CLAUSE} ({d.fc['clause_id']}). The record "
        f"carries the SHA-256 hash of its text. Its source_id resolves to the catalogued work {work33['source_id']}, whose "
        f"only source file is listed in the file manifest with a checksum that matches SHA256SUMS.txt; the upstream "
        f"repository is recorded in the provenance table. Hashes are truncated for display."
    )
    fig2 = (
        f"**Fig. 2 | Composition of the source catalogue and of the canonical clause layer.** "
        f"**a**, The {len(d.works)} catalogued works by period, as recorded in the catalogue, and by length (top; "
        f"characters per work, log scale), with the total length of each period (bottom). Each circle is one work; "
        f"horizontal offsets only separate overlapping circles. Enlarged circles mark the "
        f"{len(d.works) - d.n_role['other']} works that feed the structured layers: the canonical texts (black; C, clause "
        f"edition; S, Song edition), the variant witnesses (vermillion; G, Gui edition; Q, Qianjin Yifang) and the "
        f"{words[len(d.comm_ids)]} clause-aligned commentaries (blue), numbered in order of composition as in Figs. 3 "
        f"and 4. Grey circles are the other {d.n_role['other']} works. "
        f"**b**, Annotation of the {d.n_canon} canonical clauses by section of the six-channel division, in canonical "
        f"order. Bars give the clauses in each section. Cells give the percentage of a section's clauses that have at "
        f"least one value in each of the {fields} list-valued annotation fields of the clause record, grouped as clinical "
        f"findings, treatment, course and textual features; shading repeats the cell value. Annotation values were "
        f"extracted automatically during construction. Relapse denotes the section on yin–yang exchange and relapse "
        f"after recovery (陰陽易差後勞復病). n = {len(d.works)} works (a) and {d.n_canon} clauses (b)."
    )
    fig3 = (
        f"**Fig. 3 | Record structure and linkage.** "
        f"**a**, Data model of the release. Boxes are record types, with record counts, source directory and principal "
        f"fields; arrows run from a foreign key to the record it references. Each relation joins two nodes, and each node "
        f"is one clause, commentary or variant record (node_id equals the record identifier); commentary and variant "
        f"records reference both a canonical clause (clause_id) and a catalogued work (source_id). "
        f"**b**, Edges by relation type (log scale), coloured by the type of target record: commentary (blue), variant "
        f"(vermillion) or clause (black). "
        f"**c**, Every record linked to canonical clause {FEATURED_CLAUSE}. Left, the {len(d.fc_comms)} commentary "
        f"records aligned to the clause, from {words.get(fc_works, fc_works)} works, numbered as in Fig. 2a; the open "
        f"circle marks the commentary without a record for this clause ({', '.join(missing)}). Right, the "
        f"{words.get(len(d.fc_vars), len(d.fc_vars))} variant readings, with their similarity to the canonical clause in "
        f"parentheses, and the clauses joined to clause {FEATURED_CLAUSE} by sequence (solid) and differential (dashed) "
        f"relations. The box gives the first sentence and the closing prescription of the clause."
    )
    fig4 = (
        f"**Fig. 4 | Coverage and technical validation of the alignment layers.** "
        f"**a**, Coverage of the {d.n_canon} canonical clauses (columns, in canonical order) by each clause-aligned "
        f"commentary (blue) and variant witness (vermillion). A filled cell means that at least one record of the work "
        f"is aligned to the clause; numbers at right give the clauses covered. The band at top marks the sections; the "
        f"histogram gives, for each clause, how many of the {words[len(d.comm_ids)]} commentaries have a record for it. "
        f"{covered_any} of {d.n_canon} clauses ({pct(covered_any, d.n_canon)}) have at least one commentary record "
        f"(median, {med_wpc:g} commentaries per clause); clauses {' and '.join(map(str, d.uncovered))} have none. "
        f"{var_any} clauses have at least one variant reading. "
        f"**b**, Alignment score of each commentary record against its canonical clause, by work (medians "
        f"{meds[lo_sid]:.2f}–{meds[hi_sid]:.2f}). "
        f"**c**, Similarity of each variant reading to its canonical clause, by witness (medians "
        f"{median(d.var_sims[g]):.2f} and {median(d.var_sims[q]):.2f}); {same[g]} of the {len(d.var_sims[g])} readings "
        f"of the {VARIANT_WORKS[g][3]} and {same[q]} of the {len(d.var_sims[q])} of the {VARIANT_WORKS[q][3]} are "
        f"identical to the canonical text. Scores in b and c are those assigned by the automated alignment (range 0–1). "
        f"Points are individual records, jittered vertically; boxes show the median and interquartile range, and "
        f"whiskers extend to the most extreme value within 1.5 times the interquartile range. "
        f"n = {thousands(len(d.comms))} commentary records (b) and {len(d.variants)} variant readings (c); n per work is "
        f"given beside each row."
    )
    return [("fig1", fig1), ("fig2", fig2), ("fig3", fig3), ("fig4", fig4)]


def word_count(text: str) -> int:
    return len(text.replace("**", "").split())


def write_legends(d, reports: list[dict]) -> None:
    rows = []
    for (name, text), r in zip(legends(d), reports):
        n = word_count(text)
        if n > 300:
            sys.exit(f"{name} legend is {n} words; Nature Portfolio allows 300")
        rows.append((name, text, n, r))
    out = [
        "# Figures",
        "",
        "Figures for the data descriptor, drawn by `scripts/make_figures.py` from the released files. Every number in",
        "a figure and in its legend is computed from the data when the script runs, so the two cannot drift apart.",
        "",
        "| Figure | Vector | Raster | Size (mm) | Legend |",
        "|---|---|---|---|---|",
    ]
    for name, _, n, r in rows:
        out.append(
            f"| {name[-1]} | [{name}.pdf]({name}.pdf) | [{name}.png]({name}.png) ({r['png_px'][0]} × {r['png_px'][1]} px, "
            f"{r['png_dpi'][0]} dpi) | {r['pdf_mm'][0]:g} × {r['pdf_mm'][1]:g} | {n} words |"
        )
    out += [
        "",
        "Specification: Nature Portfolio double-column width (183 mm), Arial 5–7 pt with 8 pt bold panel labels, strokes",
        "of 0.25–1 pt, Okabe–Ito colours, RGB. PDFs are vector with live text (fonts embedded as TrueType subsets; Han",
        "characters use a CJK face). PNGs are 800 dpi. Regenerate with `python3 scripts/make_figures.py`.",
        "",
        "## Legends",
        "",
    ]
    for _, text, _, _ in rows:
        out += [text, ""]
    (OUT / "LEGENDS.md").write_text("\n".join(out), encoding="utf-8")



def main() -> None:
    fonts = setup_style()
    d = load()
    reports = []
    for name, build in (("fig1", fig1), ("fig2", fig2), ("fig3", fig3), ("fig4", fig4)):
        r = save(build(d), name, fonts)
        reports.append(r)
        print(
            f"{r['name']}: {r['pdf_mm'][0]} × {r['pdf_mm'][1]} mm · PNG {r['png_px'][0]} × {r['png_px'][1]} px "
            f"at {r['png_dpi'][0]} dpi · fonts {', '.join(r['fonts'])}"
        )
    write_legends(d, reports)
    print(f"legends: {OUT.relative_to(ROOT) / 'LEGENDS.md'}")


if __name__ == "__main__":
    main()
