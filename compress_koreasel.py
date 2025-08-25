#!/usr/bin/env python3
"""
Compress files from KoreaSEL into compressed_KoreaSEL using simple format-specific minifiers.
CSS, JavaScript, and HTML are processed with basic whitespace and comment removal.
Outputs the compressed size and reduction ratio for each file.
"""
import re
import shutil
from pathlib import Path


def minify_css(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*([{};:,])\s*", r"\1", text)
    return text.strip()


def minify_js(text: str) -> str:
    text = re.sub(r"//.*", "", text)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*([{};:,=+\-*/()<>])\s*", r"\1", text)
    return text.strip()


def minify_html(text: str) -> str:
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r">\s+<", "><", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def compress_file(src: Path, dst_dir: Path) -> tuple[int, int, str]:
    ext = src.suffix.lower()
    text = src.read_text(encoding="utf-8")
    if ext == ".js":
        compressed = minify_js(text)
        out_name = f"{src.stem}-min{src.suffix}"
    elif ext == ".css":
        compressed = minify_css(text)
        out_name = f"{src.stem}-min{src.suffix}"
    elif ext == ".html":
        compressed = minify_html(text)
        out_name = src.name
    else:
        compressed = text
        out_name = src.name
    dst_path = dst_dir / out_name
    dst_path.write_text(compressed, encoding="utf-8")
    return src.stat().st_size, dst_path.stat().st_size, out_name


def main() -> None:
    source_dir = Path("KoreaSEL")
    target_dir = Path("compressed_KoreaSEL")
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir()

    total_original = 0
    total_compressed = 0

    for src in source_dir.iterdir():
        if not src.is_file():
            continue
        orig_size, comp_size, name = compress_file(src, target_dir)
        total_original += orig_size
        total_compressed += comp_size
        reduction = (1 - comp_size / orig_size) * 100 if orig_size else 0
        print(
            f"{src.name} -> {name}: {orig_size} bytes -> {comp_size} bytes ({reduction:.2f}% reduction)"
        )

    if total_original:
        total_reduction = (1 - total_compressed / total_original) * 100
        print(
            f"Total: {total_original} bytes -> {total_compressed} bytes ({total_reduction:.2f}% reduction)"
        )


if __name__ == "__main__":
    main()
