import 'package:flutter/material.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AllValue Link NFC Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _status = 'Idle';
  String? _token;
  Map<String, dynamic>? _content;

  Future<void> _scanNfc() async {
    setState(() {
      _status = 'Waiting for NFC tag...';
      _token = null;
      _content = null;
    });

    try {
      // Start polling for an NFC tag
      NFCTag tag = await FlutterNfcKit.poll(timeout: const Duration(seconds: 15));

      // Try to read NDEF records if available
      List<NDEFRecord>? records;
      try {
        records = await FlutterNfcKit.readNDEFRecords();
      } catch (_) {
        records = null;
      }

      String? uri;
      if (records != null && records.isNotEmpty) {
        for (var r in records) {
          // Many NDEF URI records present their payload as a string
          final payload = r.payload;
          if (payload != null && payload.isNotEmpty) {
            final text = payload;
            if (text.startsWith('http')) {
              uri = text;
              break;
            }
          }
        }
      }

      // Fallback: try to see if tag has an ndefMessage as string
      if (uri == null) {
        uri = tag.ndefMessage ?? tag.id;
      }

      setState(() {
        _status = 'Tag read';
      });

      if (uri != null) {
        // Extract token from uri with pattern /t/{token}
        final reg = RegExp(r'/t/([^/?#]+)');
        final m = reg.firstMatch(uri);
        if (m != null) {
          final token = m.group(1);
          setState(() {
            _token = token;
            _status = 'Token extracted: $token';
          });
          await _fetchContent(token!);
        } else {
          setState(() {
            _status = 'No token found in URI: $uri';
          });
        }
      } else {
        setState(() {
          _status = 'No URI found on tag';
        });
      }
    } catch (e) {
      setState(() {
        _status = 'NFC error: $e';
      });
    } finally {
      try {
        await FlutterNfcKit.finish();
      } catch (_) {}
    }
  }

  Future<void> _fetchContent(String token) async {
    setState(() {
      _status = 'Fetching content for token...';
    });

    try {
      // If running on Android emulator, use 10.0.2.2 to reach host machine
      final url = Uri.parse('http://10.0.2.2:8000/t/$token');
      final resp = await http.get(url).timeout(const Duration(seconds: 10));
      if (resp.statusCode == 200) {
        final data = json.decode(resp.body) as Map<String, dynamic>;
        setState(() {
          _content = data;
          _status = 'Content loaded';
        });
      } else {
        setState(() {
          _status = 'Backend error: ${resp.statusCode} ${resp.body}';
        });
      }
    } catch (e) {
      setState(() {
        _status = 'Fetch error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AllValue Link NFC Demo'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status: $_status'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _scanNfc,
              child: const Text('Scan NFC'),
            ),
            const SizedBox(height: 12),
            if (_token != null) Text('Token: $_token'),
            const SizedBox(height: 12),
            if (_content != null)
              Expanded(
                child: SingleChildScrollView(
                  child: Text(const JsonEncoder.withIndent('  ').convert(_content)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}


