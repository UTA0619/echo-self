import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';

class DifficultySelector extends StatelessWidget {
  const DifficultySelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final int value;
  final ValueChanged<int> onChanged;

  static const _labels = ['Novice', 'Adept', 'Expert', 'Master', 'Void'];
  static const _colors = [
    Color(0xFF55FF99),
    Color(0xFFFFD700),
    Color(0xFFFF9900),
    Color(0xFFFF5555),
    Color(0xFFAA00FF),
  ];

  // Difficulty tiers: 1,3,5,7,10
  static const _tiers = [1, 3, 5, 7, 10];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Difficulty',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: EidolonColors.textSecondary,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: List.generate(5, (i) {
            final tier = _tiers[i];
            final selected = value == tier;
            final color = _colors[i];
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(tier),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: selected
                        ? color.withValues(alpha: 0.2)
                        : EidolonColors.surfaceElevated,
                    border: Border.all(
                      color: selected ? color : EidolonColors.border,
                      width: selected ? 1.5 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$tier',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: selected
                                  ? color
                                  : EidolonColors.textSecondary,
                            ),
                      ),
                      Text(
                        _labels[i],
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              fontSize: 8,
                              color: selected
                                  ? color
                                  : EidolonColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
