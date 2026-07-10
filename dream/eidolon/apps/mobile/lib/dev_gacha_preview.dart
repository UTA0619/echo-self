import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_item_sprite.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_reveal_view.dart';
import 'package:flutter/material.dart';

/// Dev-only harness: a row of one sprite per rarity (colour reads at a glance)
/// + the full single-pull reveal burst for a Legendary. Run:
/// flutter run -t lib/dev_gacha_preview.dart
void main() => runApp(const _GachaPreviewApp());

GachaItem _item(String id, GachaRarity r) => GachaItem(
      id: id,
      name: '$id spirit',
      description: '',
      rarity: r,
      category: GachaCategory.cosmetic,
      iconEmoji: '✨',
    );

class _GachaPreviewApp extends StatelessWidget {
  const _GachaPreviewApp();

  @override
  Widget build(BuildContext context) {
    final samples = [
      _item('leg_x', GachaRarity.legendary),
      _item('epc_x', GachaRarity.epic),
      _item('rar_x', GachaRarity.rare),
      _item('com_x', GachaRarity.common),
    ];
    final legendary = _item('astral_phoenix', GachaRarity.legendary);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      locale: const Locale('ja'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        backgroundColor: const Color(0xFF09090F),
        body: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 16),
              Wrap(
                spacing: 16,
                alignment: WrapAlignment.center,
                children: [
                  for (final s in samples)
                    Column(
                      children: [
                        GachaItemSprite(item: s, size: 72),
                        Text(
                          s.rarity.label,
                          style: const TextStyle(
                            color: Color(0xFF9898B8),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              const Divider(color: Color(0xFF252636)),
              Expanded(
                child: GachaRevealView(
                  result: GachaPullResult(
                    items: [legendary],
                    pulledAt: DateTime.now(),
                    crystalsSpent: 100,
                  ),
                  onDone: () {},
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
