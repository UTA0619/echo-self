import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class EidolonChatBubble extends StatelessWidget {
  const EidolonChatBubble({super.key, required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isEidolon = message.isFromEidolon;
    return Padding(
      padding: EdgeInsets.only(
        left: isEidolon ? 16 : 64,
        right: isEidolon ? 64 : 16,
        bottom: 8,
      ),
      child: Column(
        crossAxisAlignment:
            isEidolon ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isEidolon ? 4 : 16),
                bottomRight: Radius.circular(isEidolon ? 16 : 4),
              ),
              color: isEidolon
                  ? EidolonColors.surfaceElevated
                  : EidolonColors.accent.withValues(alpha: 0.25),
              border: isEidolon
                  ? Border.all(
                      color: EidolonColors.accent.withValues(alpha: 0.3),
                    )
                  : null,
            ),
            child: Text(
              message.text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                    color: isEidolon
                        ? EidolonColors.textPrimary
                        : EidolonColors.textPrimary,
                  ),
            ),
          ),
          if (isEidolon && message.modelUsed != null)
            Padding(
              padding: const EdgeInsets.only(top: 2, left: 4),
              child: Text(
                message.modelUsed!,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      fontSize: 9,
                      color: EidolonColors.textSecondary.withValues(alpha: 0.5),
                    ),
              ),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1, end: 0);
  }
}

class EidolonTypingIndicator extends StatelessWidget {
  const EidolonTypingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, bottom: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) {
          return Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: EidolonColors.accent,
            ),
          )
              .animate(onPlay: (c) => c.repeat())
              .scaleXY(
                begin: 0.5,
                end: 1.0,
                duration: 600.ms,
                delay: Duration(milliseconds: i * 150),
                curve: Curves.easeInOut,
              )
              .then()
              .scaleXY(begin: 1.0, end: 0.5, duration: 600.ms);
        }),
      ),
    );
  }
}
