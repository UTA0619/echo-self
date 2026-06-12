import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_types/shared_types.dart';

class DungeonRoomCard extends StatelessWidget {
  const DungeonRoomCard({
    super.key,
    required this.room,
    required this.roomNumber,
    required this.totalRooms,
  });

  final DungeonRoom room;
  final int roomNumber;
  final int totalRooms;

  static const _eventColors = {
    'combat': Color(0xFFFF5555),
    'treasure': Color(0xFFFFD700),
    'rest': Color(0xFF55FF55),
    'story': Color(0xFF7B5CF6),
    'boss': Color(0xFFFF3300),
  };

  static const _eventIcons = {
    'combat': '⚔️',
    'treasure': '💎',
    'rest': '🌿',
    'story': '📜',
    'boss': '💀',
  };

  @override
  Widget build(BuildContext context) {
    final eventColor =
        _eventColors[room.eventType] ?? EidolonColors.textSecondary;
    final eventIcon = _eventIcons[room.eventType] ?? '❓';
    final isBoss = room.eventType == 'boss';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: EidolonColors.surfaceElevated,
        border: Border.all(
          color: eventColor.withValues(alpha: isBoss ? 0.8 : 0.3),
          width: isBoss ? 2 : 1,
        ),
        boxShadow: isBoss
            ? [
                BoxShadow(
                  color: eventColor.withValues(alpha: 0.25),
                  blurRadius: 20,
                  spreadRadius: 4,
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Text(eventIcon, style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.l10n.dungeonRoomProgress(roomNumber, totalRooms),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: EidolonColors.textSecondary,
                          ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        color: eventColor.withValues(alpha: 0.15),
                      ),
                      child: Text(
                        room.eventType.toUpperCase(),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: eventColor,
                              letterSpacing: 1,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Description
          Text(
            room.description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  height: 1.6,
                  color: isBoss
                      ? EidolonColors.textPrimary
                      : EidolonColors.textSecondary,
                ),
          ),

          // Boss info if applicable
          if (isBoss && room.eventData.containsKey('name')) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: eventColor.withValues(alpha: 0.1),
              ),
              child: Text(
                room.eventData['name'] as String? ??
                    context.l10n.dungeonFinalBoss,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: eventColor,
                    ),
              ),
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0, curve: Curves.easeOut);
  }
}
