import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:eidolon/features/onboarding/presentation/widgets/personality_slider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Page-local ephemeral UI state (convention: Riverpod for ALL state).
final _currentQuestionProvider = StateProvider.autoDispose<int>((_) => 0);

class PersonalityPage extends ConsumerStatefulWidget {
  const PersonalityPage({super.key});

  @override
  ConsumerState<PersonalityPage> createState() => _PersonalityPageState();
}

class _PersonalityPageState extends ConsumerState<PersonalityPage> {
  final _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _answer(int questionId, int value) {
    ref.read(onboardingNotifierProvider.notifier).setAnswer(questionId, value);
    // Auto-advance after short delay
    Future.delayed(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      final current = ref.read(_currentQuestionProvider);
      if (current < kPersonalityQuestions.length - 1) {
        ref.read(_currentQuestionProvider.notifier).state = current + 1;
        _pageController.nextPage(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _proceed() {
    ref.read(onboardingNotifierProvider.notifier).nextStep();
    context.go('/onboarding/3');
  }

  @override
  Widget build(BuildContext context) {
    final answers = ref.watch(
      onboardingNotifierProvider.select((s) => s.answers),
    );
    final canProceed = answers.length >= kPersonalityQuestions.length;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              Text(
                context.l10n.onboardingPersonalityTitle,
                style: Theme.of(context).textTheme.displayMedium,
              ).animate().fadeIn(duration: 400.ms),
              const SizedBox(height: 4),
              Text(
                context.l10n.onboardingPersonalitySubtitle,
                style: Theme.of(context).textTheme.bodyMedium,
              ).animate(delay: 100.ms).fadeIn(),
              const SizedBox(height: 20),
              // Progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: answers.length / kPersonalityQuestions.length,
                  minHeight: 4,
                  backgroundColor: EidolonColors.border,
                  color: EidolonColors.accent,
                ),
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 4),
              Text(
                '${answers.length} / ${kPersonalityQuestions.length}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Question pager
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: kPersonalityQuestions.length,
            itemBuilder: (context, index) {
              final q = kPersonalityQuestions[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: PersonalitySlider(
                  key: ValueKey(q.id),
                  question: q.text,
                  value: answers[q.id] ?? 0,
                  onChanged: (v) => _answer(q.id, v),
                  questionIndex: index,
                ),
              );
            },
          ),
        ),

        // Navigation dots
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(kPersonalityQuestions.length, (i) {
              final answered = answers.containsKey(kPersonalityQuestions[i].id);
              final current = ref.watch(_currentQuestionProvider);
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == current ? 16 : 6,
                height: 6,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  color: answered
                      ? EidolonColors.accent
                      : i == current
                          ? EidolonColors.textSecondary
                          : EidolonColors.border,
                ),
              );
            }),
          ),
        ),

        Padding(
          padding: const EdgeInsets.fromLTRB(32, 8, 32, 40),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canProceed ? _proceed : null,
              child: Text(context.l10n.buttonContinue),
            ),
          ),
        ),
      ],
    );
  }
}
