"""Prepare the committed DenteArte export for GitHub Pages."""
from pathlib import Path
from urllib.parse import quote
from xml.etree import ElementTree
import json
import re
import shutil


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "_site"
ASSETS = ROOT / "assets" / "runtime"
BASE_URL = "https://www.dentearte.com.br/"
SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"


def canonical_url(filename: str) -> str:
    return BASE_URL + ("" if filename == "index.html" else quote(filename))


def dentist_json_ld() -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "Dentist",
        "@id": BASE_URL + "#clinica",
        "name": "DenteArte Odontologia",
        "url": BASE_URL,
        "telephone": "+5511973125799",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Avenida Paulista, 726, Conjunto 103, 1º andar",
            "addressLocality": "São Paulo",
            "addressRegion": "SP",
            "postalCode": "01310-100",
            "addressCountry": "BR",
        },
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + "</script>"


def prepare_html(source: Path) -> str:
    html = source.read_text(encoding="utf-8")
    html = html.replace("https://www.dentearte.com/", BASE_URL).replace(
        "Cerqueira César · São Paulo — SP", "Bela Vista · São Paulo — SP · CEP 01310-100"
    )
    html = re.sub(r'\s*<p class="review-note">[^<]*</p>', "", html)
    if source.name == "404.html":
        return html

    html = html.replace(
        '<meta name="robots" content="noindex, nofollow">',
        '<meta name="robots" content="index, follow">',
    )
    url = canonical_url(source.name)
    metadata = []
    if '<link rel="canonical"' not in html:
        metadata.append(f'<link rel="canonical" href="{url}">')
    if '<meta property="og:url"' not in html:
        metadata.append(f'<meta property="og:url" content="{url}">')
    if source.name == "index.html" and 'application/ld+json' not in html:
        metadata.append(dentist_json_ld())
    if metadata:
        html = html.replace("</head>", "\n  " + "\n  ".join(metadata) + "\n</head>", 1)
    return html


def write_sitemap(pages: list[Path]) -> None:
    urlset = ElementTree.Element("urlset", xmlns=SITEMAP_NAMESPACE)
    for page in pages:
        if page.name != "404.html":
            url = ElementTree.SubElement(urlset, "url")
            ElementTree.SubElement(url, "loc").text = canonical_url(page.name)
    ElementTree.indent(urlset)
    ElementTree.ElementTree(urlset).write(
        OUTPUT / "sitemap.xml", encoding="utf-8", xml_declaration=True
    )


def prepare_pages() -> None:
    if not (ROOT / "index.html").is_file() or not ASSETS.is_dir():
        raise ValueError("The committed export must include index.html and assets/runtime.")

    OUTPUT.mkdir()
    shutil.copytree(ASSETS, OUTPUT / "assets" / "runtime")
    pages = sorted(ROOT.glob("*.html"))
    for source in pages:
        (OUTPUT / source.name).write_text(prepare_html(source), encoding="utf-8")

    write_sitemap(pages)
    (OUTPUT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}sitemap.xml\n", encoding="utf-8"
    )


if __name__ == "__main__":
    prepare_pages()
