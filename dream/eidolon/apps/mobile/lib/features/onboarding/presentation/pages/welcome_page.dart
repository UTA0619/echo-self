import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:eidolon/features/onboarding/presentation/widgets/eidolon_orb.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class WelcomePage extends ConsumerWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        children: [
          const Spacer(flex: 2),

          // Hero orb
          const EidolonOrb(size: 180)
              .animate()
              .fadeIn(duration: 900.ms)
              .scaleXY(
                begin: 0.7,
                end: 1.0,
                curve: Curves.elasticOut,
                duration: 1200.ms,
              ),

          const SizedBox(height: 48),

          // Title
          Text(
            'EIDOLON',
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  letterSpacing: 12,
                  foreground: Paint()
                    ..shader = const LinearGradient(
                      colors: [
                        EidolonColors.accentGlow,
                        EidolonColors.soulCore,
                      ],
                    ).createShader(const Rect.fromLTWH(0, 0, 200, 60)),
                ),
          )
              .animate(delay: 400.ms)
              .fadeIn(duration: 700.ms)
              .slideY(begin: 0.3, end: 0, curve: Curves.easeOut),

          const SizedBox(height: 16),

          // Tagline
          Text(
            context.l10n.soulTwinTagline,
            textAlign: TextAlign.center,
            style:
                Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.7),
          ).animate(delay: 700.ms).fadeIn(duration: 700.ms),

          const Spacer(flex: 3),

          // CTA button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                ref.read(onboardingNotifierProvider.notifier).nextStep();
                context.go('/onboarding/1');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: EidolonColors.accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                context.l10n.buttonGetStarted,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
              ),
            ),
          )
              .animate(delay: 1000.ms)
              .fadeIn(duration: 600.ms)
              .slideY(begin: 0.4, end: 0, curve: Curves.easeOut),

          const SizedBox(height: 16),

          TextButton(
            onPressed: () => context.go('/onboarding/1'),
            child: Text(
              context.l10n.buttonSkip,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ).animate(delay: 1200.ms).fadeIn(duration: 400.ms),

          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
