import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// Dev-only harness to eyeball [EidolonAvatar] across every mood without auth.
/// Run with: flutter run -t lib/dev_avatar_preview.dart
void main() => runApp(const _AvatarPreviewApp());

class _AvatarPreviewApp extends StatelessWidget {
  const _AvatarPreviewApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF09090F),
        body: Center(
          child: Wrap(
            spacing: 28,
            runSpacing: 28,
            alignment: WrapAlignment.center,
            children: EidolonMood.values.map((m) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  EidolonAvatar(mood: m, size: 130),
                  const SizedBox(height: 6),
                  Text(
                    m.name,
                    style: const TextStyle(
                      color: Color(0xFF9898B8),
                      fontSize: 14,
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
