import 'package:flutter/painting.dart';
import 'package:shared_types/shared_types.dart';

enum BodyForm { round, teardrop, chubby, slim }

enum CrownType { none, ears, horns, antennae, halo, fin, leaf }

enum Marking { none, spots, belly, stripe, constellation }

/// Elemental archetype for collectible creatures. Each maps to a distinct
/// silhouette + colour family so a pull reads at a glance — fire creatures are
/// red and horned, water ones blue and finned, nature green and leafy, etc.
/// This is what gives the gacha collectible variety across all ages.
enum CreatureElement { water, fire, nature, demon, robot, arcane }

/// Deterministic "visual DNA" for an Eidolon.
///
/// Every companion looks one-of-a-kind, yet reproducible: the Big Five traits
/// steer the *meaning* of the look (open minds get exotic crowns, extraverts
/// get vivid colours, calmer souls run warmer) while a stable seed — the
/// Eidolon id — decides the rest. No image generation, so it stays free,
/// offline and fully animatable.
class AvatarGenes {
  const AvatarGenes({
    required this.primary,
    required this.secondary,
    required this.body,
    required this.crown,
    required this.marking,
    required this.sparkles,
    required this.eyeSpacing,
  });

  final Color primary;
  final Color secondary;
  final BodyForm body;
  final CrownType crown;
  final Marking marking;
  final int sparkles;
  final double eyeSpacing;

  static const fallback = AvatarGenes(
    primary: Color(0xFF45D8C0),
    secondary: Color(0xFF1E7A6E),
    body: BodyForm.round,
    crown: CrownType.ears,
    marking: Marking.none,
    sparkles: 1,
    eyeSpacing: 0.13,
  );

  /// Genes from an arbitrary [seed] (e.g. a gacha item id) — derives a
  /// pseudo-personality from the hash so each item gets a distinct creature.
  factory AvatarGenes.fromSeed(String seed) {
    final h = _fnv1a(seed);
    return AvatarGenes.fromPersonality(
      PersonalityProfile(
        openness: h % 101,
        conscientiousness: (h >> 4) % 101,
        extraversion: (h >> 8) % 101,
        agreeableness: (h >> 12) % 101,
        neuroticism: (h >> 16) % 101,
      ),
      seed: seed,
    );
  }

  /// A creature themed to an elemental [element] — distinct shape + colour
  /// family per element, with per-[seed] variation so two fire creatures still
  /// differ. This is what makes the gacha feel collectible.
  factory AvatarGenes.forElement(CreatureElement element, {String seed = ''}) {
    final h = _fnv1a('$seed:${element.name}');
    double jitter(int shift, double range) =>
        (((h >> shift) & 0xFF) / 255.0 - 0.5) * range;

    final (
      double baseHue,
      double sat,
      double light,
      BodyForm body,
      CrownType crown,
      Marking marking,
      int sparkles,
    ) = switch (element) {
      CreatureElement.water => (
          200.0, 0.62, 0.58, BodyForm.teardrop, CrownType.fin, Marking.belly, 1,
        ),
      CreatureElement.fire => (
          16.0, 0.82, 0.55, BodyForm.slim, CrownType.horns, Marking.stripe, 2,
        ),
      CreatureElement.nature => (
          100.0, 0.55, 0.50, BodyForm.chubby, CrownType.leaf, Marking.spots, 1,
        ),
      CreatureElement.demon => (
          282.0, 0.52, 0.48, BodyForm.slim, CrownType.horns, Marking.stripe, 0,
        ),
      CreatureElement.robot => (
          205.0, 0.12, 0.60, BodyForm.round, CrownType.antennae,
          Marking.stripe, 0,
        ),
      CreatureElement.arcane => (
          45.0, 0.78, 0.58, BodyForm.round, CrownType.halo,
          Marking.constellation, 3,
        ),
    };

    final hue = (baseHue + jitter(5, 22)) % 360;
    final primary = HSLColor.fromAHSL(1, hue, sat, light).toColor();
    final secondary = HSLColor.fromAHSL(
      1,
      hue,
      (sat * 0.95).clamp(0.0, 1.0),
      (light * 0.5).clamp(0.0, 1.0),
    ).toColor();

    return AvatarGenes(
      primary: primary,
      secondary: secondary,
      body: body,
      crown: crown,
      marking: marking,
      sparkles: sparkles,
      eyeSpacing: 0.12 + ((h >> 14) & 7) / 100,
    );
  }

  /// Same creature, recoloured — used to stamp a gacha item with its rarity hue.
  AvatarGenes withPalette(Color primary, Color secondary) => AvatarGenes(
        primary: primary,
        secondary: secondary,
        body: body,
        crown: crown,
        marking: marking,
        sparkles: sparkles,
        eyeSpacing: eyeSpacing,
      );

  factory AvatarGenes.fromPersonality(
    PersonalityProfile p, {
    String seed = '',
  }) {
    final key = seed.isEmpty
        ? '${p.openness}.${p.conscientiousness}.${p.extraversion}.'
            '${p.agreeableness}.${p.neuroticism}'
        : seed;
    final h = _fnv1a(key);
    int pick(int shift, int mod) => ((h >> shift) & 0xFFFF) % mod;

    final hue = ((p.openness * 2.2) + ((h >> 5) & 0xFF)) % 360;
    final sat = (0.42 + p.extraversion / 100 * 0.40).clamp(0.35, 0.86);
    final light = (0.50 + (100 - p.neuroticism) / 100 * 0.12).clamp(0.46, 0.64);
    final primary = HSLColor.fromAHSL(1, hue.toDouble(), sat, light).toColor();
    final secondary = HSLColor.fromAHSL(
      1,
      hue.toDouble(),
      (sat * 0.92).clamp(0.0, 1.0),
      (light * 0.46).clamp(0.0, 1.0),
    ).toColor();

    final body = p.conscientiousness > 58
        ? (pick(2, 2) == 0 ? BodyForm.round : BodyForm.slim)
        : (pick(2, 2) == 0 ? BodyForm.chubby : BodyForm.teardrop);

    final crown = p.openness > 70
        ? [CrownType.horns, CrownType.antennae, CrownType.halo][pick(8, 3)]
        : p.openness > 42
            ? CrownType.ears
            : (pick(8, 2) == 0 ? CrownType.ears : CrownType.none);

    final marking = p.agreeableness > 64
        ? Marking.belly
        : p.openness > 66
            ? Marking.constellation
            : Marking.values[pick(11, Marking.values.length)];

    return AvatarGenes(
      primary: primary,
      secondary: secondary,
      body: body,
      crown: crown,
      marking: marking,
      sparkles: (p.openness / 34).floor().clamp(0, 3),
      eyeSpacing: 0.115 + pick(14, 5) / 100,
    );
  }

  static int _fnv1a(String s) {
    var h = 0x811c9dc5;
    for (final c in s.codeUnits) {
      h ^= c;
      h = (h * 0x01000193) & 0x7FFFFFFF;
    }
    return h;
  }
}
