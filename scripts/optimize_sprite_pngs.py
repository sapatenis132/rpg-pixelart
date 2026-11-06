"""Recompress sprite PNG streams without changing pixels, palettes or dimensions."""
from pathlib import Path
import struct
import zlib

SIGNATURE = b"\x89PNG\r\n\x1a\n"


def chunks(data):
    if not data.startswith(SIGNATURE):
        raise ValueError("Not a PNG")
    offset = len(SIGNATURE)
    result = []
    while offset < len(data):
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + size]
        crc = struct.unpack(">I", data[offset + 8 + size:offset + 12 + size])[0]
        if zlib.crc32(kind + payload) & 0xFFFFFFFF != crc:
            raise ValueError("PNG chunk checksum mismatch")
        result.append((kind, payload))
        offset += size + 12
    if offset != len(data) or not result or result[-1][0] != b"IEND":
        raise ValueError("Incomplete PNG")
    return result


def encode_chunk(kind, payload):
    return (struct.pack(">I", len(payload)) + kind + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF))


def optimize(data):
    original = chunks(data)
    scanlines = zlib.decompress(b"".join(p for k, p in original if k == b"IDAT"))
    packed = zlib.compress(scanlines, level=9)
    output = bytearray(SIGNATURE)
    inserted = False
    for kind, payload in original:
        if kind == b"IDAT":
            if not inserted:
                output.extend(encode_chunk(kind, packed))
                inserted = True
        else:
            output.extend(encode_chunk(kind, payload))
    candidate = bytes(output)
    checked = chunks(candidate)
    assert [(k, p) for k, p in original if k != b"IDAT"] == [
        (k, p) for k, p in checked if k != b"IDAT"]
    assert scanlines == zlib.decompress(b"".join(p for k, p in checked if k == b"IDAT"))
    return candidate if len(candidate) < len(data) else data


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1] / "assets" / "sprites"
    before = after = changed = 0
    for path in sorted(root.rglob("*.png")):
        original = path.read_bytes()
        result = optimize(original)
        before += len(original)
        after += len(result)
        if result != original:
            path.write_bytes(result)
            changed += 1
    print(f"{changed} PNGs optimized: {before:,} -> {after:,} bytes; pixels unchanged.")
