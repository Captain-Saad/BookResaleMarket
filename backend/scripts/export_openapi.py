"""Write the API contract to packages/api-client/openapi.json; the frontend's TypeScript types
are generated from it (`pnpm api:generate`).

Run from backend/: uv run python -m scripts.export_openapi
"""

import json
from pathlib import Path

from app.core.config import Settings
from app.main import create_app

OUTPUT = Path(__file__).resolve().parents[2] / "packages" / "api-client" / "openapi.json"


def main() -> None:
    schema = create_app(Settings(_env_file=None, env="test")).openapi()
    OUTPUT.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
