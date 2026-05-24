import 'package:eidolon/core/router/app_router.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:eidolon/features/onboarding/presentation/widgets/step_indicator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Shell wrapping all onboarding steps.
/// Manages back-button and step navigation.
class OnboardingShell extends ConsumerWidget {
  const OnboardingShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(onboardingNotifierProvider);

    return Scaffold(
      backgroundColor: EidolonColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: [
                  if (state.currentStep > 0)
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded),
                      color: EidolonColors.textSecondary,
                      onPressed: () {
                        ref.read(onboardingNotifierProvider.notifier).previousStep();
                        context.go('/onboarding/${state.currentStep - 1}');
                      },
                    )
                  else
                    const SizedBox(width: 48),
                  const Spacer(),
                  StepIndicator(
                    totalSteps: 4,
                    currentStep: state.currentStep,
                  ),
                  const Spacer(),
                  const SizedBox(width: 48),
                ],
              ),
            ),

            // Page content
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}

// Route guard: if onboarding is complete, redirect to home
String? onboardingRedirect(OnboardingState state, BuildContext context) {
  if (state.isComplete) return Routes.home;
  return null;
}
