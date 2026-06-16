import 'package:eidolon/features/dungeon/presentation/widgets/battle_scene.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// Dev-only harness for [BattleScene]. Run:
/// flutter run -t lib/dev_battle_preview.dart
void main() => runApp(const _BattlePreviewApp());

class _BattlePreviewApp extends StatelessWidget {
  const _BattlePreviewApp();

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
          child: BattleScene(playerGenes: genes, playerName: 'Nova'),
        ),
      ),
    );
  }
}
