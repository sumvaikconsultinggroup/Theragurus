"""Import reviewed TheraGurus WordPress content as inert, structured text.

Usage: python scripts/import-legacy.py --pages snapshot.json --posts health-posts.json
Only the two original health categories belong in the posts snapshot.
No source HTML, scripts, embeds, forms, or event handlers are rendered.
"""
import argparse
import html
import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote


def clean(value):
    value = unicodedata.normalize("NFKC", html.unescape(value))
    value = re.sub(r"[\u200b-\u200f\ufeff]", "", value)
    value = re.sub(r"[\U0001F000-\U0001FFFF\u2600-\u27BF]", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return re.sub(r"\s+([,.;:!?])", r"\1", value)


class TextBlocks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.active = None
        self.kind = None
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "iframe", "svg", "form"):
            self.ignored += 1
        if self.ignored:
            return
        classes = dict(attrs).get("class", "")
        disclosure = bool(re.search(r"elementor-(?:toggle|accordion)-title", classes))
        if (tag in ("h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote") or disclosure) and self.active is None:
            self.active = tag
            self.kind = "question" if disclosure else "heading" if tag.startswith("h") else "list" if tag == "li" else "quote" if tag == "blockquote" else "paragraph"
            self.parts = []
        if tag == "br" and self.active:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "iframe", "svg", "form"):
            self.ignored = max(0, self.ignored - 1)
        if self.ignored or self.active != tag:
            return
        text = clean(" ".join(self.parts))
        self.active = None
        if len(text) < 4 or re.search(r"^(know more|read more|book now|click here|learn more|rewrite it|\.{3})", text, re.I):
            return
        if re.search(r"rewrite it|theragurus marketer", text, re.I):
            return
        kind = self.kind
        if not any(b["text"] == text for b in self.blocks):
            self.blocks.append({"type": kind, "text": text})

    def handle_data(self, data):
        if self.active and not self.ignored:
            self.parts.append(data)


def blocks(markup):
    parser = TextBlocks()
    parser.feed(markup)
    return parser.blocks


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--pages", required=True)
    args.add_argument("--posts", required=True)
    args.add_argument("--output", default="src/data/legacy-content.json")
    options = args.parse_args()
    pages = json.loads(Path(options.pages).read_text(encoding="utf-8-sig"))
    posts = json.loads(Path(options.posts).read_text(encoding="utf-8-sig"))
    excluded = {"theragurus", "my-account", "cart", "checkout", "shop", "customer-cabinet", "sitemap"}
    result = {"pages": [], "articles": []}
    for page in pages:
        slug = unquote(page["slug"])
        if slug in excluded:
            continue
        parsed = blocks(page["content"]["rendered"])
        result["pages"].append({"slug": slug, "title": clean(re.sub(r"<[^>]+>", "", page["title"]["rendered"])), "source": page["link"], "blocks": parsed})
    for post in posts:
        if not set(post["categories"]).intersection({14, 15}):
            continue
        title = clean(re.sub(r"<[^>]+>", "", post["title"]["rendered"]))
        if re.search(r"casino|gambling|slot machine|betpanda|spinbob", title, re.I):
            continue
        parsed = blocks(post["content"]["rendered"])
        excerpt = next((b["text"] for b in parsed if b["type"] == "paragraph" and len(b["text"]) > 90), "Explore pelvic health and workplace wellbeing with TheraGurus.")
        words = sum(len(b["text"].split()) for b in parsed)
        result["articles"].append({"slug": unquote(post["slug"]), "title": title, "source": post["link"], "category": "workplace" if 15 in post["categories"] else "pelvic", "date": post["date"][:10], "excerpt": excerpt[:230].rsplit(" ", 1)[0] + "…", "minutes": max(2, round(words / 210)), "blocks": parsed})
    output = Path(options.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Imported {len(result['pages'])} content pages and {len(result['articles'])} reviewed health articles ({output.stat().st_size:,} bytes).")


if __name__ == "__main__":
    main()
