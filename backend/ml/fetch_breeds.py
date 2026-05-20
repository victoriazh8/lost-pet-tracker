"""
Fetches breed lists from dogapi.dog (JSONAPI) and The Cat API, then saves them
to breeds.json in the same directory. Run once during Docker build.
"""
import json
import urllib.request
import urllib.error
import ssl
import os

# macOS Python venvs often lack system CA certs — safe to skip for public read-only APIs
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

# dogapi.dog returns all ~283 breeds in one page (JSONAPI format)
DOG_API = "https://dogapi.dog/api/v2/breeds"
CAT_API = "https://api.thecatapi.com/v1/breeds"


def fetch_dog_names(url):
    """dogapi.dog: {"data": [{"attributes": {"name": "Affenpinscher"}}, ...]}"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "lost-pet-tracker/1.0"})
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as r:
            data = json.loads(r.read())
            return [
                item["attributes"]["name"]
                for item in data.get("data", [])
                if item.get("attributes", {}).get("name")
            ]
    except Exception as e:
        print(f"Warning: could not fetch {url}: {e}", flush=True)
        return []


def fetch_cat_names(url):
    """thecatapi.com: [{"name": "Abyssinian"}, ...]"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "lost-pet-tracker/1.0"})
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as r:
            data = json.loads(r.read())
            return [b["name"] for b in data if b.get("name")]
    except Exception as e:
        print(f"Warning: could not fetch {url}: {e}", flush=True)
        return []


def main():
    print("Fetching dog breeds...", flush=True)
    dogs = fetch_dog_names(DOG_API)

    print("Fetching cat breeds...", flush=True)
    cats = fetch_cat_names(CAT_API)

    out = {"dogs": sorted(dogs), "cats": sorted(cats)}
    path = os.path.join(os.path.dirname(__file__), "breeds.json")

    with open(path, "w") as f:
        json.dump(out, f, indent=2)

    print(f"Saved {len(dogs)} dog breeds + {len(cats)} cat breeds → {path}", flush=True)


if __name__ == "__main__":
    main()
