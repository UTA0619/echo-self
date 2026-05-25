import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class UsernamePage extends ConsumerStatefulWidget {
  const UsernamePage({super.key});

  @override
  ConsumerState<UsernamePage> createState() => _UsernamePageState();
}

class _UsernamePageState extends ConsumerState<UsernamePage> {
  final _controller = TextEditingController();
  String? _validationError;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _validate(String value) {
    if (value.isEmpty) return null;
    if (value.length < 3) return 'At least 3 characters';
    if (value.length > 20) return 'Maximum 20 characters';
    if (!RegExp(r'^[a-z0-9_]+$').hasMatch(value)) {
      return 'Lowercase letters, numbers, and _ only';
    }
    return null;
  }

  void _onChanged(String value) {
    ref.read(onboardingNotifierProvider.notifier).setUsername(value.toLowerCase());
    setState(() => _validationError = _validate(value.toLowerCase()));
  }

  void _proceed() {
    final error = _validate(_controller.text.toLowerCase());
    if (error != null) {
      setState(() => _validationError = error);
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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),

          Text(
            'Choose your\nidentity.',
            style: Theme.of(context).textTheme.displayMedium,
          ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2, end: 0),

          const SizedBox(height: 8),

          Text(
            'Your Eidolon will remember this forever.',
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
              hintText: 'e.g. shadow_walker',
              errorText: _validationError,
              prefixIcon: const Icon(
                Icons.alternate_email_rounded,
                color: EidolonColors.accent,
              ),
              suffixIcon: _controller.text.isNotEmpty && _validationError == null
                  ? const Icon(Icons.check_circle_rounded, color: EidolonColors.success)
                  : null,
              counterText: '${_controller.text.length}/20',
            ),
          ).animate(delay: 300.ms).fadeIn(duration: 400.ms),

          const SizedBox(height: 12),

          Text(
            'Lowercase letters, numbers, and underscores only.',
            style: Theme.of(context).textTheme.labelSmall,
          ).animate(delay: 400.ms).fadeIn(),

          const Spacer(),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canProceed && _validationError == null ? _proceed : null,
              child: const Text('Continue'),
            ),
          ).animate(delay: 500.ms).fadeIn(duration: 400.ms).slideY(begin: 0.3, end: 0),

          const SizedBox(height: 40),
        ],
      ),
    );
  }
}
