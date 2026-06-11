import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Likert-scale slider (1-5) for one Big Five question.
class PersonalitySlider extends StatelessWidget {
  const PersonalitySlider({
    super.key,
    required this.question,
    required this.value,
    required this.onChanged,
    required this.questionIndex,
  });

  final String question;
  final int value; // 1-5, 0 = unanswered
  final ValueChanged<int> onChanged;
  final int questionIndex;

  static const _labels = [
    'Strongly\nDisagree',
    '',
    'Neutral',
    '',
    'Strongly\nAgree',
  ];
  static const _colors = [
    Color(0xFF5A5AFF),
    Color(0xFF8A7AFF),
    Color(0xFF7B6CF6),
    Color(0xFFB070E0),
    Color(0xFFFF70C0),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Question text
        Text(
          question,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(height: 1.5),
        ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2, end: 0),

        const SizedBox(height: 24),

        // Dot selector
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(5, (i) {
            final selected = value == i + 1;
            final dotColor = _colors[i];
            return GestureDetector(
              onTap: () => onChanged(i + 1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: selected ? 44 : 32,
                height: selected ? 44 : 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? dotColor : EidolonColors.surfaceElevated,
                  border: Border.all(
                    color: selected ? dotColor : EidolonColors.border,
                    width: selected ? 0 : 1,
                  ),
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: dotColor.withValues(alpha: 0.5),
                            blurRadius: 12,
                            spreadRadius: 2,
                          ),
                        ]
                      : null,
                ),
                child: selected
                    ? const Icon(Icons.check, color: Colors.white, size: 18)
                    : null,
              ),
            );
          }),
        ).animate().fadeIn(delay: 150.ms, duration: 350.ms),

        const SizedBox(height: 8),

        // Labels
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: _labels
              .map(
                (l) => SizedBox(
                  width: 52,
                  child: Text(
                    l,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}
