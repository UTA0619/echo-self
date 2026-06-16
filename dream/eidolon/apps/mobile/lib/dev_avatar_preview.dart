import 'dart:math';

import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// Dev-only harness: top row shows one Eidolon across every mood; the grid
/// below shows unique creatures generated from random personalities, proving
/// the "world's only one" look. Run: flutter run -t lib/dev_avatar_preview.dart
void main() => runApp(const _AvatarPreviewApp());

class _AvatarPreviewApp extends StatelessWidget {
  const _AvatarPreviewApp();

  @override
  Widget build(BuildContext context) {
    final rng = Random(7);
    final unique = List.generate(12, (i) {
      final p = PersonalityProfile(
        openness: rng.nextInt(101),
        conscientiousness: rng.nextInt(101),
        extraversion: rng.nextInt(101),
        agreeableness: rng.nextInt(101),
        neuroticism: rng.nextInt(101),
      );
      return AvatarGenes.fromPersonality(p, seed: 'eidolon-$i');
    });

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF09090F),
        body: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 28),
          child: Column(
            children: [
              const _Label('one Eidolon · every mood'),
              Wrap(
                spacing: 20,
                runSpacing: 16,
                alignment: WrapAlignment.center,
                children: EidolonMood.values.map((m) {
                  return EidolonAvatar(mood: m, size: 96);
                }).toList(),
              ),
              const SizedBox(height: 32),
              const _Label('every owner · a one-of-a-kind look'),
              Wrap(
                spacing: 20,
                runSpacing: 20,
                alignment: WrapAlignment.center,
                children: unique
                    .map((g) => EidolonAvatar(size: 96, genes: g))
                    .toList(),
              ),
            ],
          ),
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
        padding: const EdgeInsets.only(bottom: 14),
        child: Text(
          text,
          style: const TextStyle(color: Color(0xFF9898B8), fontSize: 14),
        ),
      );
}
