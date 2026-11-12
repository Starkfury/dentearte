"""Prepare the public DenteArte preview from the committed static export."""
from pathlib import Path
import re
import shutil


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "_site"
ASSETS = ROOT / "assets" / "runtime"
PRIVATE_VIDEO = "apresentacao.*.mp4"


def replace_presentation(html: str) -> str:
    if 'id="video-apresentacao"' not in html:
        return html

    intro = re.search(
        r'(?P<start>  <div class="da-intro-actions">).*?(?=</section>)',
        html,
        re.DOTALL,
    )
    if intro is None or 'id="video-apresentacao"' not in intro[0]:
        raise ValueError("Could not identify the presentation section in index.html.")
    poster = re.search(r'poster="(assets/runtime/apresentacao-capa\.[^"]+\.webp)"', intro[0])
    if poster is None or not (ROOT / poster[1]).is_file():
        raise ValueError("The presentation portrait is missing from the export.")

    replacement = (
        '  <div class="da-intro-actions"><a class="button button-blue" href="profissional.html">'
        'Conheça a trajetória do Dr. Leon</a><a class="text-link" href="clinica.html#ambiente">'
        'Conheça a clínica</a></div></div>\n'
        '  <div class="da-intro-film"><figure class="da-media-card"><div class="da-media-shell">'
        f'<img class="da-video" src="{poster[1]}" alt="Dr. Leon Daghlian no consultório da DenteArte" '
        'width="540" height="960" loading="lazy" decoding="async"></div>'
        '<figcaption><strong>Conheça a DenteArte</strong><span>Dr. Leon Daghlian no consultório.</span>'
        '</figcaption></figure></div>\n'
    )
    html = html[:intro.start()] + replacement + html[intro.end():]
    return re.sub(r'<script src="assets/runtime/media\.[^"]+\.js" defer></script>\n?', "", html)


def prepare_pages() -> None:
    if not (ROOT / "index.html").is_file() or not ASSETS.is_dir():
        raise ValueError("The committed export must include index.html and assets/runtime.")

    OUTPUT.mkdir()
    shutil.copytree(ASSETS, OUTPUT / "assets" / "runtime", ignore=shutil.ignore_patterns(PRIVATE_VIDEO))
    shutil.copy2(ROOT / "robots.txt", OUTPUT / "robots.txt")
    for source in sorted(ROOT.glob("*.html")):
        html = source.read_text(encoding="utf-8")
        html = (
            html.replace("https://www.dentearte.com/", "https://www.dentearte.com.br/")
            .replace("Cerqueira César · São Paulo — SP", "Bela Vista · São Paulo — SP · CEP 01310-100")
            .replace(
                "Os vídeos de apresentação, recepção, consultório e entrada",
                "Os vídeos da recepção, do consultório e da entrada",
            )
        )
        if source.name == "index.html":
            html = replace_presentation(html)
        if re.search(r'apresentacao\.[^"\s]+\.mp4', html):
            raise ValueError(f"The presentation video is still referenced by {source.name}.")
        (OUTPUT / source.name).write_text(html, encoding="utf-8")


if __name__ == "__main__":
    prepare_pages()
