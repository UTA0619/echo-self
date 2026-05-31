import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';

/// Dismissible error banner displayed at the bottom of the home hub scroll view.
class HomeErrorBanner extends StatelessWidget {
  const HomeErrorBanner({
    super.key,
    required this.message,
    required this.onDismiss,
  });

  final String message;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: EidolonColors.error.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: EidolonColors.error.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.error_outline,
              color: EidolonColors.error,
              size: 18,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: EidolonColors.error,
                    ),
              ),
            ),
            GestureDetector(
              onTap: onDismiss,
              child: const Icon(
                Icons.close,
                color: EidolonColors.error,
                size: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
