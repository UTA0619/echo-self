import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_types/shared_types.dart';

/// Renders a gacha item as a living, colourful little spirit instead of a flat
/// emoji: a one-of-a-kind creature (shape/crown/markings derived from the item
/// id) stamped with its rarity colour, so pulls read at a glance and feel alive.
class GachaItemSprite extends StatelessWidget {
  const GachaItemSprite({super.key, required this.item, this.size = 104});

  final GachaItem item;
  final double size;

  static const _palettes = {
    GachaRarity.legendary: (Color(0xFFFFB347), Color(0xFF8B5A12)),
    GachaRarity.epic: (Color(0xFFAB5CF7), Color(0xFF5A2E86)),
    GachaRarity.rare: (Color(0xFF5AB4FF), Color(0xFF1E5C8C)),
    GachaRarity.common: (Color(0xFF6FC58E), Color(0xFF2E6B47)),
  };

  @override
  Widget build(BuildContext context) {
    final (primary, secondary) = _palettes[item.rarity]!;
    final genes = AvatarGenes.fromSeed(item.id).withPalette(primary, secondary);
    final lively =
        item.rarity == GachaRarity.legendary || item.rarity == GachaRarity.epic;
    return EidolonAvatar(
      mood: lively ? EidolonMood.excited : EidolonMood.calm,
      genes: genes,
      size: size,
    );
  }
}
