import 'dart:async';

import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/level_up_avatar.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// Dev-only harness: bumps the level every few seconds so the home
/// [LevelUpAvatar] gold burst plays on a loop. Run:
/// flutter run -t lib/dev_levelup_preview.dart
void main() => runApp(const _LevelUpPreviewApp());

class _LevelUpPreviewApp extends StatefulWidget {
  const _LevelUpPreviewApp();
  @override
  State<_LevelUpPreviewApp> createState() => _S();
}

class _S extends State<_LevelUpPreviewApp> {
  int _level = 5;
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted) setState(() => _level++);
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final genes = AvatarGenes.fromPersonality(
      const PersonalityProfile(openness: 82, extraversion: 70),
      seed: 'nova',
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF09090F),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              LevelUpAvatar(
                mood: EidolonMood.calm,
                genes: genes,
                level: _level,
                size: 120,
              ),
              const SizedBox(height: 16),
              Text(
                'Lv.$_level',
                style: const TextStyle(color: Color(0xFFF0F0FF), fontSize: 18),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
