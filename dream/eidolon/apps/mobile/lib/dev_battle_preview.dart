import 'package:eidolon/features/dungeon/presentation/widgets/battle_scene.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// Dev-only harness for [BattleScene]. Shows the SAME difficulty fought by a
/// fresh Lv.1 Eidolon vs a leveled-up one — proving that progression (higher
/// HP/ATK) is what makes harder dungeons winnable. Run:
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
    // A fresh Lv.1 stat line vs what gainXp() produces after ~11 levels.
    final lv1 = EidolonProfile(
      id: 'x',
      userId: 'u',
      name: 'Nova',
      personality: const PersonalityProfile(),
      createdAt: DateTime.utc(2026),
      updatedAt: DateTime.utc(2026),
    );
    final lv12 = lv1.gainXp(40000);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF09090F),
        body: ListView(
          padding: const EdgeInsets.symmetric(vertical: 24),
          children: [
            _Label('Lv.${lv1.level}  (ATK ${lv1.baseAtk} / HP ${lv1.baseHp})'
                '  ·  difficulty 5'),
            BattleScene(
              playerGenes: genes,
              playerName: 'Nova',
              difficulty: 5,
              playerMaxHp: lv1.baseHp,
              playerAtk: lv1.baseAtk,
            ),
            const SizedBox(height: 8),
            _Label('Lv.${lv12.level}  (ATK ${lv12.baseAtk} / HP ${lv12.baseHp})'
                '  ·  difficulty 5'),
            BattleScene(
              playerGenes: genes,
              playerName: 'Nova',
              difficulty: 5,
              playerMaxHp: lv12.baseHp,
              playerAtk: lv12.baseAtk,
            ),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        child: Text(
          text,
          style: const TextStyle(color: Color(0xFF9898B8), fontSize: 13),
        ),
      );
}
