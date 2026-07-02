"""Extract every embedded campaign asset from the source SVG and PDF."""

from __future__ import annotations

import base64
import csv
import hashlib
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

from pypdf import PdfReader


def number(value: str | None) -> str:
    return value or ""


def extract_svg(source: pathlib.Path, output: pathlib.Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    root = ET.parse(source).getroot()
    xlink = "{http://www.w3.org/1999/xlink}href"
    rows: list[dict[str, str]] = []
    texts: list[str] = []
    colors: set[str] = set()
    image_number = 0

    for index, element in enumerate(root.iter()):
        if element.text and element.text.strip():
            texts.append(element.text.strip())
        for value in element.attrib.values():
            colors.update(re.findall(r"#[0-9a-fA-F]{3,8}\b", value))

        if not element.tag.endswith("image"):
            continue
        href = element.get(xlink) or element.get("href") or ""
        image_number += 1
        row = {
            "number": str(image_number),
            "xml_index": str(index),
            "x": number(element.get("x")),
            "y": number(element.get("y")),
            "width": number(element.get("width")),
            "height": number(element.get("height")),
            "source_type": "external",
            "filename": "",
            "bytes": "",
            "sha256": "",
        }
        if href.startswith("data:image/"):
            header, encoded = href.split(",", 1)
            media_type = header.split(";")[0].split(":", 1)[1]
            extension = media_type.split("/")[1].replace("jpeg", "jpg")
            data = base64.b64decode(encoded)
            filename = f"svg-image-{image_number:03d}.{extension}"
            (output / filename).write_bytes(data)
            row.update(
                source_type=media_type,
                filename=filename,
                bytes=str(len(data)),
                sha256=hashlib.sha256(data).hexdigest(),
            )
        else:
            row["filename"] = href
        rows.append(row)

    with (output / "manifest.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    (output / "text-content.txt").write_text("\n".join(texts), encoding="utf-8")
    (output / "color-palette.txt").write_text("\n".join(sorted(colors)), encoding="utf-8")


def extract_pdf(source: pathlib.Path, output: pathlib.Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(source)
    text_parts: list[str] = []
    image_rows: list[dict[str, str]] = []

    for page_number, page in enumerate(reader.pages, 1):
        text_parts.append(f"--- PAGE {page_number} ---\n{page.extract_text() or ''}")
        for image_number, image in enumerate(page.images, 1):
            suffix = pathlib.Path(image.name).suffix or ".bin"
            filename = f"pdf-page-{page_number:03d}-image-{image_number:03d}{suffix}"
            target = output / filename
            target.write_bytes(image.data)
            image_rows.append(
                {
                    "page": str(page_number),
                    "number": str(image_number),
                    "original_name": image.name,
                    "filename": filename,
                    "bytes": str(len(image.data)),
                    "sha256": hashlib.sha256(image.data).hexdigest(),
                }
            )

    (output / "text-content.txt").write_text("\n\n".join(text_parts), encoding="utf-8")
    if image_rows:
        with (output / "manifest.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=image_rows[0].keys())
            writer.writeheader()
            writer.writerows(image_rows)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: extract_campaign_assets.py SOURCE_SVG SOURCE_PDF OUTPUT_DIR")
    svg, pdf, output = map(pathlib.Path, sys.argv[1:])
    extract_svg(svg, output / "svg-embedded")
    extract_pdf(pdf, output / "pdf-embedded")


if __name__ == "__main__":
    main()
