"""Check the installable package without executing CMS code or changing any data."""
from pathlib import Path
from zipfile import ZipFile
import hashlib

root = Path(__file__).resolve().parents[1]
package = root / "dist" / "obolos-de-sanaka-1.1.0.zip"
expected = {
    "sanaka-obolo-idempotency.php": root / "sanaka-obolo-idempotency.php",
    "README.md": root / "README.md",
}
for folder in ("includes", "assets"):
    for path in (root / folder).rglob("*"):
        if path.is_file():
            expected[path.relative_to(root).as_posix()] = path

with ZipFile(package) as archive:
    prefix = "sanaka-obolo-idempotency/"
    assert archive.testzip() is None, "Invalid ZIP CRC"
    assert set(archive.namelist()) == {prefix + name for name in expected}
    for name, path in expected.items():
        assert archive.read(prefix + name) == path.read_bytes(), name + " differs from source"

digest = hashlib.sha256(package.read_bytes()).hexdigest()
assert (package.with_suffix(".zip.sha256")).read_text().strip() == digest
print(f"Package verified: {package.stat().st_size} bytes, SHA-256 {digest}")
