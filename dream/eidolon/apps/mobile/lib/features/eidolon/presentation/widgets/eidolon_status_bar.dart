import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_types/shared_types.dart';

class EidolonStatusBar extends StatelessWidget {
  const EidolonStatusBar({super.key, required this.eidolon});

  final EidolonProfile eidolon;

  static final _moodIcons = {
    EidolonMood.calm: '🌙',
    EidolonMood.excited: '⚡',
    EidolonMood.anxious: '🌀',
    EidolonMood.tired: '💤',
    EidolonMood.focused: '🎯',
    EidolonMood.melancholic: '🌧',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: EidolonColors.surfaceElevated,
        border: Border(
          bottom: BorderSide(
            color: EidolonColors.accent.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Row(
        children: [
          // Mood indicator
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: EidolonColors.accent.withValues(alpha: 0.15),
              border: Border.all(
                color: EidolonColors.accent.withValues(alpha: 0.4),
              ),
            ),
            child: Center(
              child: Text(
                _moodIcons[eidolon.currentMood] ?? '✨',
                style: const TextStyle(fontSize: 18),
              ),
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 0.95, end: 1.05, duration: 2.seconds),

          const SizedBox(width: 12),

          // Name + mood
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eidolon.name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: EidolonColors.accentGlow,
                        letterSpacing: 1,
                      ),
                ),
                Text(
                  eidolon.currentMood.name,
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),

          // Level + XP bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Lv.${eidolon.level}',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: EidolonColors.textSecondary,
                    ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                width: 64,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: eidolon.levelProgress.clamp(0.0, 1.0),
                    minHeight: 3,
                    backgroundColor: EidolonColors.border,
                    color: EidolonColors.soulCore,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
