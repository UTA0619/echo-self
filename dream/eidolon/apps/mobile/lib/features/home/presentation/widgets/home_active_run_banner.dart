import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Red warning banner shown when the player has an active dungeon run.
class HomeActiveRunBanner extends StatelessWidget {
  const HomeActiveRunBanner({super.key, required this.activeRunId});
  final String? activeRunId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: GestureDetector(
        onTap: () => context.go('/dungeon'),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFFCC2222).withValues(alpha: 0.3),
                const Color(0xFF881111).withValues(alpha: 0.2),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFFCC2222).withValues(alpha: 0.5),
            ),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                color: Color(0xFFFF6666),
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Active dungeon run in progress — tap to return',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFFFF9999),
                      ),
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios,
                color: Color(0xFFFF6666),
                size: 14,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
