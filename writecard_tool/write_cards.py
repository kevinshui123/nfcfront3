#!/usr/bin/env python3
"""
Simple NFC write tool using nfcpy.
Writes an NDEF URI record `BASE_URL/t/{token}` for each token in tokens file.
"""
import argparse
import sys
import time
import nfc
import ndef


def write_uri_to_tag(tag, uri: str) -> bool:
    try:
        if tag.ndef:
            record = ndef.UriRecord(uri)
            tag.ndef.records = [record]
            return True
        else:
            # try to format tag as NDEF if supported
            if hasattr(tag, "format"):
                try:
                    tag.format([ndef.UriRecord(uri)])
                    return True
                except Exception:
                    return False
            return False
    except Exception as e:
        print(f"Error writing to tag: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Write NFC tags from tokens list")
    parser.add_argument("--tokens", required=True, help="Path to tokens file (one token per line)")
    parser.add_argument("--base-url", required=True, help="Base URL, e.g. https://app.example.com")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout waiting for tag (seconds)")
    args = parser.parse_args()

    with open(args.tokens, "r", encoding="utf-8") as f:
        tokens = [l.strip() for l in f.readlines() if l.strip()]

    if not tokens:
        print("No tokens found in tokens file.")
        sys.exit(1)

    clf = nfc.ContactlessFrontend('usb')
    if not clf:
        print("Unable to open NFC device. Ensure reader is connected and drivers installed.")
        sys.exit(2)

    try:
        for token in tokens:
            uri = f"{args.base_url.rstrip('/')}/t/{token}"
            print(f"\nPrepare tag for token: {token}")
            print(f"URI to write: {uri}")

            written = False
            start = time.time()

            while time.time() - start < args.timeout and not written:
                print("Waiting for tag (place tag on reader)...")
                tag = clf.connect(rdwr={'on-connect': lambda tag: tag})
                if tag is None:
                    print("No tag detected, retrying...")
                    time.sleep(1)
                    continue
                print(f"Tag detected: {tag}")
                ok = write_uri_to_tag(tag, uri)
                if ok:
                    print(f"Successfully wrote token {token}")
                    written = True
                else:
                    print("Failed to write tag. Remove tag and try again.")
                    time.sleep(1)

            if not written:
                print(f"Timeout writing token: {token}. Continue to next token.")

    finally:
        try:
            clf.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()


