from __future__ import annotations

import codecs
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from fontTools.ttLib import TTFont
from fontTools.ttLib.ttCollection import TTCollection
from fontTools.ttLib.tables._p_o_s_t import table__p_o_s_t
from fontTools.ttLib.tables._n_a_m_e import makeName


def get_base_dirs() -> Dict[str, Path]:
    base = Path(__file__).resolve().parent
    raw = base / "raw"
    processed = base / "processed"
    logs = base / "logs"

    processed.mkdir(parents=True, exist_ok=True)
    logs.mkdir(parents=True, exist_ok=True)
    raw.mkdir(parents=True, exist_ok=True)

    return {
        "base": base,
        "raw": raw,
        "processed": processed,
        "logs": logs,
    }


def has_usable_unicode_cmap(font: TTFont) -> bool:
    cmap = font.get("cmap")
    if not cmap:
        return False

    for table in cmap.tables:
        pid, eid = table.platformID, table.platEncID

        # Unicode platform (0, *)
        if pid == 0:
            return True
        # Windows Unicode BMP / UCS-4
        if pid == 3 and eid in (1, 10):
            return True

    return False


LegacyCmapSpec = Tuple[int, int, str, int]


def _legacy_cmap_specs() -> List[LegacyCmapSpec]:
    """
    可嘗試從 legacy cmap 推導 Unicode 的候選子表。

    - (platformID, platEncID, python codec, default_byte_len)
    - 只做「新增 Unicode cmap」，不覆寫任何既有 cmap，以避免破壞既有行為。
    """
    return [
        # Macintosh Roman (單位元)
        (1, 0, "mac_roman", 1),
        # Windows legacy encodings（多為雙位元，仍允許單位元碼值嘗試）
        (3, 2, "cp932", 2),  # Shift-JIS (Japanese)
        (3, 3, "gbk", 2),  # PRC (GBK / GB2312 family)
        (3, 4, "big5", 2),  # Big5 (Traditional Chinese)
        (3, 5, "cp949", 2),  # Wansung (Korean)
        (3, 6, "johab", 2),  # Johab (Korean)
    ]


def _select_best_legacy_cmap(font: TTFont) -> Optional[Tuple[object, str, int]]:
    cmap = font.get("cmap")
    if not cmap:
        return None

    best: Optional[Tuple[object, str, int]] = None
    best_size = 0
    for pid, eid, codec, byte_len in _legacy_cmap_specs():
        for table in cmap.tables:
            if table.platformID != pid or table.platEncID != eid:
                continue
            try:
                table_map = getattr(table, "cmap", None)
            except Exception:
                # 有些字型的 glyph 名稱解析會依賴不支援的 post table；
                # 這種情況直接略過該子表，避免整個腳本崩潰。
                continue
            if not isinstance(table_map, dict) or not table_map:
                continue
            size = len(table_map)
            if size > best_size:
                best_size = size
                best = (table, codec, byte_len)

    return best


def _ensure_synthetic_glyph_order(font: TTFont) -> bool:
    """
    部分舊字型的 post table 會讓 fontTools 無法取得 glyph order（例如 post format 5）。
    我們只需要「穩定的 gid↔name 對照」來完成 cmap 推導，因此可在必要時建立合成 glyph 名稱。
    """
    try:
        _ = font.getGlyphOrder()
        return True
    except Exception:
        pass

    try:
        if "maxp" not in font:
            return False
        num_glyphs = int(getattr(font["maxp"], "numGlyphs", 0) or 0)
        if num_glyphs <= 0:
            return False
    except Exception:
        return False

    # gid 0 必須是 .notdef；其餘用合成名稱即可（名稱本身不重要，只要 index 對得上）。
    order = [".notdef"] + [f"glyph{gid:05d}" for gid in range(1, num_glyphs)]
    try:
        font.setGlyphOrder(order)
        return True
    except Exception:
        return False


def _dedupe_cmap_tables_for_save(font: TTFont) -> int:
    """
    某些 fontTools 版本的 cmap subtable 排序實作有缺陷：當 (platformID, platEncID, language)
    重複時，排序會嘗試比較 dict 而直接 TypeError，導致 save 失敗。

    為了「能輸出可用字型」這個目標，我們在輸出前把同一個 triplet 的 subtable 去重，
    保留 format 較高者（通常較通用，例如 format 4）。
    """
    cmap = font.get("cmap")
    if not cmap or not getattr(cmap, "tables", None):
        return 0

    groups: Dict[Tuple[int, int, int], List[object]] = {}
    for t in list(cmap.tables):
        try:
            key = (int(t.platformID), int(t.platEncID), int(getattr(t, "language", 0) or 0))
        except Exception:
            # 罕見異常子表：保守起見不動它
            key = None
        if key is None:
            continue
        groups.setdefault(key, []).append(t)

    removed = 0
    new_tables: List[object] = []
    seen_keys: set[Tuple[int, int, int]] = set()
    for t in list(cmap.tables):
        try:
            key = (int(t.platformID), int(t.platEncID), int(getattr(t, "language", 0) or 0))
        except Exception:
            new_tables.append(t)
            continue
        if key in seen_keys:
            continue
        seen_keys.add(key)
        bucket = groups.get(key, [t])
        if len(bucket) == 1:
            new_tables.append(bucket[0])
            continue
        best = max(bucket, key=lambda x: int(getattr(x, "format", -1) or -1))
        new_tables.append(best)
        removed += len(bucket) - 1

    if removed:
        cmap.tables = new_tables
    return removed


def _replace_unsupported_post_with_format3(font: TTFont) -> bool:
    """
    有些舊字型的 'post' table 使用 fontTools 尚未支援的格式（例如 format 5），會導致 save 失敗。
    改為建立一份 fontTools 支援的 post format 3 表（不帶 glyph 名稱，僅基本 PostScript 資訊），
    讓轉出字型仍可在 Windows 安裝／預覽，且我們的程式（opentype.js）照常可用。
    """
    if "post" not in font:
        return False

    need_replace = False
    try:
        post = font["post"]
        fmt = getattr(post, "formatType", None)
        if fmt is not None:
            try:
                if float(fmt) >= 5.0:
                    need_replace = True
            except Exception:
                pass
    except Exception:
        need_replace = True

    if not need_replace:
        return False

    # 建立 format 3 post 表（無 glyph 名稱，載入時由 cmap 推導）
    new_post = table__p_o_s_t()
    new_post.formatType = 3.0
    new_post.italicAngle = 0.0
    new_post.underlinePosition = -200
    new_post.underlineThickness = 50
    new_post.isFixedPitch = 0
    new_post.minMemType42 = 0
    new_post.maxMemType42 = 0
    new_post.minMemType1 = 0
    new_post.maxMemType1 = 0

    font["post"] = new_post
    return True


# Windows 安裝/預覽需要 name 表具備 Unicode (platform 3, encoding 1) 記錄；nameID 3 為必備（unique identifier）。
REQUIRED_NAME_IDS = (1, 2, 3, 4, 6)  # Family, Subfamily, Unique ID, Full name, PostScript
WINDOWS_UNICODE_LANG = 0x409  # English (United States)
# head 表 created/modified 若為 0 或過小，Windows 會判定無效；最小合理值約 2000-01-01 對應的 Mac 時間戳。
HEAD_TIMESTAMP_MIN = 0x7C259DC0  # 1970-01-01 對應值（fontTools 用於 unix 轉換）
HEAD_TIMESTAMP_SAFE = 0xB492F400  # 2000-01-01 對應 Mac 時間戳（1904 為起算）


def _get_name_string_safe(name_table: Any, nameID: int) -> Optional[str]:
    """從 name 表取得可顯示字串，解碼失敗時用 replace 或回傳 None。"""
    if getattr(name_table, "names", None) is None:
        return None
    for rec in name_table.names:
        if rec.nameID != nameID:
            continue
        try:
            s = rec.toUnicode(errors="replace").strip()
            if s:
                return s
        except Exception:
            continue
    return name_table.getDebugName(nameID)


def _ensure_unicode_name_records(font: TTFont) -> int:
    """
    若 name 表缺少 Windows Unicode (platform 3, enc 1) 的必備記錄，從既有記錄解出字串並補上，
    讓轉出字型可通過 Windows 字型檢視／安裝驗證。
    回傳新增的記錄數。
    """
    if "name" not in font:
        return 0
    name_table = font["name"]
    if not hasattr(name_table, "names"):
        return 0
    added = 0
    ps_fallback = _get_name_string_safe(name_table, 6) or "Unknown"
    for nameID in REQUIRED_NAME_IDS:
        if name_table.getName(nameID, 3, 1, WINDOWS_UNICODE_LANG) is not None:
            continue
        text = _get_name_string_safe(name_table, nameID)
        if not text:
            if nameID == 2:
                text = "Regular"
            elif nameID == 3:
                text = _get_name_string_safe(name_table, 4) or ps_fallback
            else:
                text = ps_fallback
        text = text.replace("\x00", "").replace("\ufffd", " ").strip() or "Unknown"
        # nameID 6 (PostScript) 依規格必須為純 ASCII，否則 Windows 可能拒絕
        if nameID == 6:
            text = "".join(c if ord(c) < 128 else " " for c in text).strip() or "Unknown"
        name_table.names.append(
            makeName(text, nameID, 3, 1, WINDOWS_UNICODE_LANG)
        )
        added += 1
    return added


def _fix_head_timestamps(font: TTFont) -> bool:
    """
    Windows 會拒絕 created/modified 為 0 或過小的字型。一律寫入合理 Mac 時間戳以通過驗證。
    """
    if "head" not in font:
        return False
    head = font["head"]
    for field in ("created", "modified"):
        val = getattr(head, field, None)
        try:
            v = int(val) & 0xFFFFFFFF if val is not None else 0
        except (TypeError, ValueError):
            v = 0
        if v == 0 or v < HEAD_TIMESTAMP_MIN:
            setattr(head, field, HEAD_TIMESTAMP_SAFE)
    # 一律更新 modified 為安全值，避免舊字型殘留過小值導致 Windows 拒絕
    setattr(head, "modified", HEAD_TIMESTAMP_SAFE)
    return True


def _code_to_candidate_bytes(code: int, byte_len: int) -> List[bytes]:
    if byte_len <= 1:
        if 0 <= code <= 0xFF:
            return [bytes([code])]
        return []

    # 雙位元為主，但部分表可能出現單位元碼值；兩種都試，讓「最笨但可用」的路徑存在。
    if 0 <= code <= 0xFF:
        return [bytes([code]), bytes([0x00, code])]
    if 0x100 <= code <= 0xFFFF:
        return [bytes([(code >> 8) & 0xFF, code & 0xFF])]
    return []


def _build_unicode_map_from_legacy(legacy_table: object, codec: str, byte_len: int) -> Dict[int, str]:
    table_map = getattr(legacy_table, "cmap", None)
    if not isinstance(table_map, dict) or not table_map:
        return {}

    try:
        codecs.lookup(codec)
    except LookupError:
        return {}

    unicode_map: Dict[int, str] = {}
    for code, glyph_name in table_map.items():
        if not isinstance(code, int) or not isinstance(glyph_name, str):
            continue

        for b in _code_to_candidate_bytes(code, byte_len):
            try:
                s = b.decode(codec, errors="strict")
            except Exception:
                continue

            if len(s) != 1:
                continue
            cp = ord(s)
            # 跳過 surrogate / control，避免把奇怪映射硬塞成「可用 Unicode」
            if 0xD800 <= cp <= 0xDFFF:
                continue
            if cp < 0x20:
                continue
            if cp not in unicode_map:
                unicode_map[cp] = glyph_name
            break

    return unicode_map


def try_add_unicode_cmap_from_legacy(font: TTFont) -> int:
    """
    若字型缺少可用 Unicode cmap，嘗試從 legacy cmap 推導並新增一個 Unicode cmap 子表。

    回傳新增的 Unicode 映射數量（0 表示失敗或不需處理）。
    """
    if has_usable_unicode_cmap(font):
        return 0

    cmap = font.get("cmap")
    if not cmap:
        return 0

    # 先確保 glyph order 可用，避免 legacy cmap decompile 時因 post table 不支援而崩潰。
    _ensure_synthetic_glyph_order(font)

    picked = _select_best_legacy_cmap(font)
    if not picked:
        return 0

    legacy_table, codec, byte_len = picked
    unicode_map = _build_unicode_map_from_legacy(legacy_table, codec, byte_len)
    if not unicode_map:
        return 0

    # 目前只補 BMP（<= 0xFFFF），CJK/常見舊編碼足夠；超出範圍的碼點直接略過。
    bmp_map = {cp: name for cp, name in unicode_map.items() if cp <= 0xFFFF}
    if not bmp_map:
        return 0

    # 只追加新的 Unicode 子表，不覆寫既有子表。
    from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

    sub = CmapSubtable.newSubtable(4)
    sub.platformID = 3
    sub.platEncID = 1
    sub.language = 0
    sub.cmap = bmp_map
    cmap.tables.append(sub)

    return len(bmp_map)


def make_safe_filename(name: str, fallback: str) -> str:
    """
    將字型名稱轉成適合 Windows 檔名的安全字串。
    """
    name = (name or "").strip()
    if not name:
        name = fallback

    # Windows 禁用字元：<>:"/\|?*
    invalid = '<>:"/\\|?*'
    translate_map = {ord(c): "_" for c in invalid}
    safe = name.translate(translate_map)

    # 將連續空白壓成單一底線
    parts = safe.split()
    safe = "_".join(p for p in parts if p)

    if not safe:
        safe = fallback

    return safe


def build_ttc_output_name(font: TTFont, path: Path, idx: int) -> str:
    """
    優先用「字型家族名 + 樣式名」作為檔名，失敗時才退回原本的 -index 命名。
    """
    fallback = f"{path.stem}-{idx}"
    family = None
    style = None

    try:
        name_table = font["name"] if "name" in font else None
        if name_table is not None:
            # nameID 1: Font Family name
            # nameID 2: Font Subfamily name (Regular / Bold / etc.)
            family = name_table.getDebugName(1)
            style = name_table.getDebugName(2)
    except Exception:
        # name table 損壞就直接用 fallback
        return f"{fallback}.ttf"

    parts = [p.strip() for p in (family, style) if p and p.strip()]
    if parts:
        raw_name = "-".join(parts)
    else:
        raw_name = fallback

    safe = make_safe_filename(raw_name, fallback)

    # 確保有 .ttf 副檔名
    if not safe.lower().endswith(".ttf"):
        safe = f"{safe}.ttf"

    return safe


def process_ttc(
    path: Path,
    processed_dir: Path,
    blacklist: List[Dict[str, Any]],
    log_lines: List[str],
) -> None:
    try:
        ttc = TTCollection(str(path))
    except Exception as e:
        msg = f"[SKIP] {path.name}: cannot open TTC ({e})"
        log_lines.append(msg)
        blacklist.append(
            {
                "path": str(path),
                "reason": "ttc-open-error",
                "detail": str(e),
            }
        )
        return

    for idx, font in enumerate(ttc.fonts):
        out_name = build_ttc_output_name(font, path, idx)
        out_path = processed_dir / out_name
        try:
            if not has_usable_unicode_cmap(font):
                try:
                    added = try_add_unicode_cmap_from_legacy(font)
                except Exception as e:
                    added = 0
                    log_lines.append(
                        f"[SKIP] {path.name} (index {idx}): cmap patch error ({e})"
                    )
                if added > 0:
                    log_lines.append(
                        f"[PATCH] TTC {path.name} (index {idx}): added Unicode cmap entries={added}"
                    )

            if not has_usable_unicode_cmap(font):
                msg = f"[SKIP] {path.name} (index {idx}): no usable Unicode cmap"
                log_lines.append(msg)
                blacklist.append(
                    {
                        "path": str(path),
                        "index": idx,
                        "reason": "no-unicode-cmap",
                    }
                )
                continue

            # 若檔名碰巧重複，最後再加上索引避免覆蓋
            final_path = out_path
            if final_path.exists():
                final_path = processed_dir / make_safe_filename(
                    f"{out_path.stem}_{idx}", out_path.stem
                )
                if not final_path.name.lower().endswith(".ttf"):
                    final_path = final_path.with_suffix(".ttf")

            removed = _dedupe_cmap_tables_for_save(font)
            if removed:
                log_lines.append(
                    f"[PATCH] TTC {path.name} (index {idx}): deduped cmap subtables removed={removed}"
                )

            if _replace_unsupported_post_with_format3(font):
                log_lines.append(
                    f"[PATCH] TTC {path.name} (index {idx}): replaced unsupported post table with format 3"
                )

            name_added = _ensure_unicode_name_records(font)
            if name_added:
                log_lines.append(
                    f"[PATCH] TTC {path.name} (index {idx}): added Unicode name records={name_added}"
                )

            if _fix_head_timestamps(font):
                log_lines.append(
                    f"[PATCH] TTC {path.name} (index {idx}): fixed head created/modified timestamps"
                )

            font.save(str(final_path))
            log_lines.append(f"[OK] TTC {path.name} → {final_path.name}")
        except Exception as e:
            msg = f"[SKIP] {path.name} (index {idx}): save error ({e})"
            log_lines.append(msg)
            blacklist.append(
                {
                    "path": str(path),
                    "index": idx,
                    "reason": "ttc-save-error",
                    "detail": str(e),
                }
            )


def process_ttf(
    path: Path,
    processed_dir: Path,
    blacklist: List[Dict[str, Any]],
    log_lines: List[str],
) -> None:
    try:
        font = TTFont(str(path))
    except Exception as e:
        msg = f"[SKIP] {path.name}: cannot open TTF ({e})"
        log_lines.append(msg)
        blacklist.append(
            {
                "path": str(path),
                "reason": "ttf-open-error",
                "detail": str(e),
            }
        )
        return

    if not has_usable_unicode_cmap(font):
        try:
            added = try_add_unicode_cmap_from_legacy(font)
        except Exception as e:
            added = 0
            log_lines.append(f"[SKIP] {path.name}: cmap patch error ({e})")
        if added > 0:
            log_lines.append(f"[PATCH] {path.name}: added Unicode cmap entries={added}")

    if not has_usable_unicode_cmap(font):
        msg = f"[SKIP] {path.name}: no usable Unicode cmap"
        log_lines.append(msg)
        blacklist.append(
            {
                "path": str(path),
                "reason": "no-unicode-cmap",
            }
        )
        return

    out_path = processed_dir / path.name
    try:
        removed = _dedupe_cmap_tables_for_save(font)
        if removed:
            log_lines.append(f"[PATCH] {path.name}: deduped cmap subtables removed={removed}")

        if _replace_unsupported_post_with_format3(font):
            log_lines.append(f"[PATCH] {path.name}: replaced unsupported post table with format 3")

        name_added = _ensure_unicode_name_records(font)
        if name_added:
            log_lines.append(f"[PATCH] {path.name}: added Unicode name records={name_added}")

        if _fix_head_timestamps(font):
            log_lines.append(f"[PATCH] {path.name}: fixed head created/modified timestamps")

        font.save(str(out_path))
        log_lines.append(f"[OK] TTF {path.name} → {out_path.name}")
    except Exception as e:
        msg = f"[SKIP] {path.name}: save error ({e})"
        log_lines.append(msg)
        blacklist.append(
            {
                "path": str(path),
                "reason": "ttf-save-error",
                "detail": str(e),
            }
        )


def load_existing_blacklist(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except Exception:
        # If the existing file is corrupted, start fresh.
        pass

    return []


def save_blacklist(path: Path, entries: List[Dict[str, Any]]) -> None:
    path.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    dirs = get_base_dirs()
    raw_dir = dirs["raw"]
    processed_dir = dirs["processed"]
    logs_dir = dirs["logs"]
    base_dir = dirs["base"]

    blacklist_path = base_dir / "blacklist.json"
    log_path = logs_dir / "convert_fonts.log"

    blacklist: List[Dict[str, Any]] = load_existing_blacklist(blacklist_path)
    new_entries: List[Dict[str, Any]] = []
    log_lines: List[str] = []

    if not any(raw_dir.iterdir()):
        log_lines.append(
            f"[INFO] raw directory is empty: {raw_dir}. "
            f"Place TTC/TTF files here and rerun the script."
        )
    else:
        for path in sorted(raw_dir.rglob("*")):
            if path.is_dir():
                continue

            ext = path.suffix.lower()
            if ext == ".ttc":
                process_ttc(path, processed_dir, new_entries, log_lines)
            elif ext == ".ttf":
                process_ttf(path, processed_dir, new_entries, log_lines)
            else:
                log_lines.append(
                    f"[SKIP] {path.name}: unsupported extension '{ext}'"
                )

    if new_entries:
        blacklist.extend(new_entries)

    save_blacklist(blacklist_path, blacklist)
    log_path.write_text("\n".join(log_lines), encoding="utf-8")

    print(f"Raw fonts directory     : {raw_dir}")
    print(f"Processed fonts directory: {processed_dir}")
    print(f"Log file                : {log_path}")
    print(f"Blacklist entries total : {len(blacklist)}")


if __name__ == "__main__":
    main()

