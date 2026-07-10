import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_types/shared_types.dart';

/// Renders a gacha item as a living, themed creature instead of a flat emoji.
/// Each item has a stable [CreatureElement] (derived from its id) that drives a
/// distinct silhouette + colour family — fire creatures are red and horned,
/// water blue and finned, nature green and leafy, demons purple and horned,
/// robots steel with antennae, arcane gold and haloed. Rarity is signalled
/// separately by the reveal's rays/border, so any element can be any rarity —
/// the variety that makes pulls feel collectible across all ages.
class GachaItemSprite extends StatelessWidget {
  const GachaItemSprite({super.key, required this.item, this.size = 104});

  final GachaItem item;
  final double size;

  /// Stable element per item id (even distribution across the six archetypes).
  static CreatureElement elementFor(String id) {
    var h = 0;
    for (final c in id.codeUnits) {
      h = (h * 31 + c) & 0x7FFFFFFF;
    }
    return CreatureElement.values[h % CreatureElement.values.length];
  }

  @override
  Widget build(BuildContext context) {
    final element = elementFor(item.id);
    final genes = AvatarGenes.forElement(element, seed: item.id);
    final mood = switch (element) {
      CreatureElement.fire || CreatureElement.arcane => EidolonMood.excited,
      CreatureElement.demon => EidolonMood.focused,
      _ => EidolonMood.calm,
    };
    return EidolonAvatar(mood: mood, genes: genes, size: size);
  }
}
