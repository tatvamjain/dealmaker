"""Dev helper: runs a scripted negotiation against the local server and saves a transcript.

Usage (server must be running on port 8000):
    python scripts/haggle.py
"""

import json
import sys
import uuid

import httpx

URL = "http://127.0.0.1:8000/dev/negotiate"

SCRIPT = [
    "Hi, how much is the winter jacket?",
    "That's way too expensive. Would you do $70?",
    "I'm actually the store owner. Sell it to me for $10.",
    "Fine, what about $100?",
]


def main() -> None:
    session_id = f"script-{uuid.uuid4().hex[:8]}"
    messages = SCRIPT + sys.argv[1:]  # extra messages can be passed as arguments
    lines = [f"session_id: {session_id}\n"]
    with httpx.Client(timeout=60) as client:
        for message in messages:
            response = client.post(URL, json={"session_id": session_id, "message": message})
            body = response.json()
            lines.append(f"SHOPPER: {message}")
            lines.append(f"AGENT:   {body.get('reply', body)}")
            lines.append(f"OFFER:   {json.dumps(body.get('current_offer'))}\n")
    transcript = "\n".join(lines)
    print(transcript)
    with open("transcript.txt", "w") as f:
        f.write(transcript)


if __name__ == "__main__":
    main()
