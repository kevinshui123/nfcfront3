Flutter NFC Demo (AllValue Link)

Quick start (requires Flutter SDK and a physical Android device or emulator with NFC support):

1. Install Flutter: https://flutter.dev
2. From repo root run:
   - cd flutter_app
   - flutter pub get
3. Run on Android device/emulator:
   - flutter run

Notes:
- This demo uses `flutter_nfc_kit` to perform an NFC poll and attempts to read NDEF URI records.
- When testing on Android emulator, use `10.0.2.2` to reach backend running on host (`http://10.0.2.2:8000/t/{token}`).
- For iOS testing, use a real device and follow plugin setup instructions (Apple devices require additional entitlements).
- Do NOT commit secrets to the repo. Configure backend URL in the app code before release.


