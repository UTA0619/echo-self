import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:eidolon/features/onboarding/presentation/widgets/eidolon_orb.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EidolonNamingPage extends ConsumerStatefulWidget {
  const EidolonNamingPage({super.key});

  @override
  ConsumerState<EidolonNamingPage> createState() => _EidolonNamingPageState();
}

class _EidolonNamingPageState extends ConsumerState<EidolonNamingPage> {
  final _controller = TextEditingController();
  bool _isAwakening = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _awaken() async {
    final notifier = ref.read(onboardingNotifierProvider.notifier);

    setState(() => _isAwakening = true);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    await notifier.complete();

    if (!mounted) return;
    final state = ref.read(onboardingNotifierProvider);
    if (state.isComplete) {
      // Refresh auth status so GoRouter automatically redirects to /home
      await ref.read(authNotifierProvider.notifier).refreshAuth();
    } else {
      setState(() => _isAwakening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingNotifierProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        children: [
          const SizedBox(height: 8),

          Text(
            'Name your\nsoul-twin.',
            style: Theme.of(context).textTheme.displayMedium,
          ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2, end: 0),

          const SizedBox(height: 8),

          Text(
            'This name is bound to you forever.',
            style: Theme.of(context).textTheme.bodyMedium,
          ).animate(delay: 150.ms).fadeIn(),

          const SizedBox(height: 40),

          // Orb responds to name length
          EidolonOrb(
            size: 140,
            isAwakening: _isAwakening,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),

          const SizedBox(height: 40),

          // Name input
          TextField(
            controller: _controller,
            onChanged:
                ref.read(onboardingNotifierProvider.notifier).setEidolonName,
            textAlign: TextAlign.center,
            textCapitalization: TextCapitalization.words,
            maxLength: 24,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(letterSpacing: 2),
            decoration: InputDecoration(
              hintText: 'e.g. Aether',
              counterText: '',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ).animate(delay: 350.ms).fadeIn(duration: 400.ms),

          const SizedBox(height: 8),

          // Live preview
          AnimatedOpacity(
            opacity: state.eidolonName.trim().isNotEmpty ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 300),
            child: Text(
              '${state.eidolonName.trim()} is awakening…',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: EidolonColors.accentGlow,
                    fontStyle: FontStyle.italic,
                  ),
            ),
          ),

          // Error message
          if (state.errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              state.errorMessage!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: EidolonColors.error,
                  ),
            ),
          ],

          const Spacer(),

          // Awaken button
          SizedBox(
            width: double.infinity,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                boxShadow: state.canProceedStep3
                    ? [
                        BoxShadow(
                          color: EidolonColors.accent.withValues(alpha: 0.4),
                          blurRadius: 24,
                          spreadRadius: 2,
                        ),
                      ]
                    : null,
              ),
              child: ElevatedButton(
                onPressed: state.canProceedStep3 && !state.isSubmitting
                    ? _awaken
                    : null,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: state.isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        'Awaken ${state.eidolonName.trim().isEmpty ? '' : state.eidolonName.trim()}',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Colors.white,
                                  letterSpacing: 1.5,
                                ),
                      ),
              ),
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
