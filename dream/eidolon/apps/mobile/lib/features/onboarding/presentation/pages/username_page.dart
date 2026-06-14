import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Page-local ephemeral UI state (convention: Riverpod for ALL state).
final _validationErrorProvider =
    StateProvider.autoDispose<String?>((_) => null);

class UsernamePage extends ConsumerStatefulWidget {
  const UsernamePage({super.key});

  @override
  ConsumerState<UsernamePage> createState() => _UsernamePageState();
}

class _UsernamePageState extends ConsumerState<UsernamePage> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _validate(BuildContext context, String value) {
    if (value.isEmpty) return null;
    if (value.length < 3) return context.l10n.usernameMinLength;
    if (value.length > 20) return context.l10n.usernameMaxLength;
    if (!RegExp(r'^[a-z0-9_]+$').hasMatch(value)) {
      return context.l10n.usernameInvalidChars;
    }
    return null;
  }

  void _onChanged(String value) {
    ref
        .read(onboardingNotifierProvider.notifier)
        .setUsername(value.toLowerCase());
    ref.read(_validationErrorProvider.notifier).state =
        _validate(context, value.toLowerCase());
  }

  void _proceed() {
    final error = _validate(context, _controller.text.toLowerCase());
    if (error != null) {
      ref.read(_validationErrorProvider.notifier).state = error;
      return;
    }
    ref.read(onboardingNotifierProvider.notifier).nextStep();
    context.go('/onboarding/2');
  }

  @override
  Widget build(BuildContext context) {
    final canProceed = ref.watch(
      onboardingNotifierProvider.select((s) => s.canProceedStep1),
    );
    final validationError = ref.watch(_validationErrorProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),

          Text(
            context.l10n.onboardingIdentityTitle,
            style: Theme.of(context).textTheme.displayMedium,
          ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2, end: 0),

          const SizedBox(height: 8),

          Text(
            context.l10n.onboardingUsernameHint,
            style: Theme.of(context).textTheme.bodyMedium,
          ).animate(delay: 150.ms).fadeIn(duration: 400.ms),

          const SizedBox(height: 40),

          // Username input
          TextField(
            controller: _controller,
            onChanged: _onChanged,
            autofocus: true,
            autocorrect: false,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _proceed(),
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  letterSpacing: 1.5,
                  fontWeight: FontWeight.w600,
                ),
            decoration: InputDecoration(
              hintText: context.l10n.usernameHintExample,
              errorText: validationError,
              prefixIcon: const Icon(
                Icons.alternate_email_rounded,
                color: EidolonColors.accent,
              ),
              suffixIcon: _controller.text.isNotEmpty && validationError == null
                  ? const Icon(
                      Icons.check_circle_rounded,
                      color: EidolonColors.success,
                    )
                  : null,
              counterText: '${_controller.text.length}/20',
            ),
          ).animate(delay: 300.ms).fadeIn(duration: 400.ms),

          const SizedBox(height: 12),

          Text(
            context.l10n.usernameHelper,
            style: Theme.of(context).textTheme.labelSmall,
          ).animate(delay: 400.ms).fadeIn(),

          const Spacer(),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed:
                  canProceed && validationError == null ? _proceed : null,
              child: Text(context.l10n.buttonContinue),
            ),
          )
              .animate(delay: 500.ms)
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.3, end: 0),

          const SizedBox(height: 40),
        ],
      ),
    );
  }
}
