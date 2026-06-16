import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_chat_bubble.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_input_bar.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_status_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_types/shared_types.dart';

class EidolonPage extends ConsumerStatefulWidget {
  const EidolonPage({super.key});

  @override
  ConsumerState<EidolonPage> createState() => _EidolonPageState();
}

class _EidolonPageState extends ConsumerState<EidolonPage> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(eidolonNotifierProvider.notifier).loadEidolon(),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eidolonNotifierProvider);

    ref.listen(eidolonNotifierProvider, (prev, next) {
      if (next.messages.length != (prev?.messages.length ?? 0)) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Status bar or loading shimmer
            if (state.isLoading)
              _LoadingStatusBar()
            else if (state.eidolon != null)
              EidolonStatusBar(eidolon: state.eidolon!),

            // Error banner
            if (state.errorMessage != null)
              _ErrorBanner(
                message: state.errorMessage!,
                onDismiss: () =>
                    ref.read(eidolonNotifierProvider.notifier).clearError(),
              ),

            // Chat area
            Expanded(
              child: state.isLoading
                  ? const _LoadingBody()
                  : state.eidolon == null && state.errorMessage != null
                      ? _RetryBody(
                          onRetry: () => ref
                              .read(eidolonNotifierProvider.notifier)
                              .loadEidolon(),
                        )
                      : _ChatBody(
                          scrollController: _scrollController,
                          state: state,
                        ),
            ),

            // Input
            if (state.eidolon != null)
              EidolonInputBar(
                isEnabled: !state.isSending,
                onSend: (text) => ref
                    .read(eidolonNotifierProvider.notifier)
                    .sendMessage(text),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Private sub-widgets ───────────────────────────────────────────────────────

class _ChatBody extends StatelessWidget {
  const _ChatBody({
    required this.scrollController,
    required this.state,
  });

  final ScrollController scrollController;
  final EidolonState state;

  @override
  Widget build(BuildContext context) {
    final messages = state.messages;

    if (messages.isEmpty) {
      return _EmptyState(
        eidolonName: state.eidolon?.name ?? '',
        mood: state.eidolon?.currentMood ?? EidolonMood.calm,
      );
    }

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: messages.length + (state.isSending ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == messages.length) {
          return const EidolonTypingIndicator();
        }
        return EidolonChatBubble(message: messages[index]);
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.eidolonName, required this.mood});
  final String eidolonName;
  final EidolonMood mood;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          EidolonAvatar(mood: mood, size: 120),
          const SizedBox(height: 16),
          Text(
            eidolonName.isEmpty
                ? context.l10n.eidolonAwaits
                : context.l10n.eidolonReady(eidolonName),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: EidolonColors.textSecondary,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            context.l10n.eidolonSaySomething,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: EidolonColors.textSecondary,
                ),
          ),
        ],
      ).animate().fadeIn(delay: 300.ms, duration: 600.ms),
    );
  }
}

class _LoadingStatusBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      color: EidolonColors.surfaceElevated,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: EidolonColors.border,
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true)).shimmer(
                duration: 1.seconds,
                color: EidolonColors.accent.withValues(alpha: 0.1),
              ),
          const SizedBox(width: 12),
          Container(width: 100, height: 12, color: EidolonColors.border)
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .shimmer(duration: 1.seconds),
        ],
      ),
    );
  }
}

class _LoadingBody extends StatelessWidget {
  const _LoadingBody();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(color: EidolonColors.accent),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onDismiss});
  final String message;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: EidolonColors.error.withValues(alpha: 0.15),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            color: EidolonColors.error,
            size: 16,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.error,
                  ),
            ),
          ),
          GestureDetector(
            onTap: onDismiss,
            child:
                const Icon(Icons.close, color: EidolonColors.error, size: 16),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}

class _RetryBody extends StatelessWidget {
  const _RetryBody({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            context.l10n.eidolonUnreachable,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: onRetry,
            child: Text(context.l10n.buttonRetry),
          ),
        ],
      ),
    );
  }
}
