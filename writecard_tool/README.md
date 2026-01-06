Write Card Tool (Python, nfcpy) — CLI for ACR122U / PCSC readers

Overview
- Lightweight Python CLI that writes NDEF URI records to NFC tags using a USB NFC reader (e.g., ACR122U).
- The tool reads a simple tokens file (one token per line) and for each token waits for a tag to be presented, writes the URI `BASE_URL/t/{token}` as an NDEF URI record, and confirms success.

Requirements
- Python 3.9+
- `nfcpy` package (install via pip)
- A CR122U or compatible PC/SC NFC reader attached to the machine

Installation
1. Create a virtualenv and activate it:
   python -m venv .venv
   source .venv/bin/activate  # on Windows: .venv\\Scripts\\activate
2. Install dependencies:
   pip install -r requirements.txt

Usage
- Prepare a tokens file, one token per line, e.g. `tokens.txt`:
  demo-token-1
  demo-token-2

- Run the script:
  python write_cards.py --tokens tokens.txt --base-url http://app.example.com

- The script will iterate over tokens. For each token:
  - Prompt: "Waiting for tag for token: {token}"
  - Hold the NFC tag to the reader; the script writes an NDEF URI record and reports success/failure.

Notes & Caveats
- On Windows you may need proper PC/SC drivers for your reader. ACR122U usually works with the default driver.
- nfcpy may require Administrator privileges on Windows for direct reader access.
- This script writes one tag at a time and is intended for small-to-medium batches. For large-scale production consider using a vendor SDK or specialized hardware with bulk writing support.


