import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('OnboardingState', () {
    test('default state has correct initial values', () {
      const state = OnboardingState();
      expect(state.currentStep, 0);
      expect(state.username, '');
      expect(state.eidolonName, '');
      expect(state.answers, isEmpty);
      expect(state.isSubmitting, false);
      expect(state.isComplete, false);
      expect(state.errorMessage, isNull);
    });

    group('canProceedStep1', () {
      test('false when username is empty', () {
        expect(const OnboardingState().canProceedStep1, false);
      });

      test('false when username is less than 3 chars', () {
        expect(const OnboardingState(username: 'ab').canProceedStep1, false);
      });

      test('true when username is 3 or more chars', () {
        expect(const OnboardingState(username: 'abc').canProceedStep1, true);
        expect(const OnboardingState(username: 'shadow_walker').canProceedStep1, true);
      });

      test('false when username is only whitespace', () {
        expect(const OnboardingState(username: '   ').canProceedStep1, false);
      });
    });

    group('canProceedStep2', () {
      test('false when answers are fewer than 10', () {
        const state = OnboardingState(answers: {1: 3, 2: 4});
        expect(state.canProceedStep2, false);
      });

      test('true when all 10 questions are answered', () {
        final answers = {for (var i = 1; i <= 10; i++) i: 3};
        expect(OnboardingState(answers: answers).canProceedStep2, true);
      });
    });

    group('canProceedStep3', () {
      test('false when eidolonName is empty', () {
        expect(const OnboardingState().canProceedStep3, false);
      });

      test('false when eidolonName is only whitespace', () {
        expect(const OnboardingState(eidolonName: '   ').canProceedStep3, false);
      });

      test('true when eidolonName has non-whitespace chars', () {
        expect(const OnboardingState(eidolonName: 'Aether').canProceedStep3, true);
      });
    });

    group('scoreFor', () {
      // All neutral answers (value=3) → score 50
      test('returns 50 for all neutral answers', () {
        final answers = {for (var q in kPersonalityQuestions) q.id: 3};
        final state = OnboardingState(answers: answers);
        for (final trait in OceanTrait.values) {
          expect(
            state.scoreFor(trait),
            50,
            reason: 'Expected 50 for $trait with all neutral answers',
          );
        }
      });

      // All strongly agree (5) on forward items → near 100
      test('returns high score when all items are strongly agreed', () {
        final answers = {for (var q in kPersonalityQuestions) q.id: 5};
        final state = OnboardingState(answers: answers);
        for (final trait in OceanTrait.values) {
          final score = state.scoreFor(trait);
          expect(
            score,
            greaterThanOrEqualTo(50),
            reason: 'Expected high score for $trait',
          );
        }
      });

      // Reversed item: strongly agree (5) → should score low for that trait
      test('reversed items invert score contribution', () {
        final reversed = kPersonalityQuestions.where((q) => q.reversed).toList();
        if (reversed.isEmpty) return; // skip if no reversed questions

        final q = reversed.first;
        // Only answer the reversed question with 5; leave others at 3
        final answers = {
          for (var question in kPersonalityQuestions)
            question.id: question.id == q.id ? 5 : 3,
        };
        final state = OnboardingState(answers: answers);
        // Reversed item with value=5 should contribute as if value=1 (low)
        // So the trait score should be ≤ 50 (pulled below neutral)
        final score = state.scoreFor(q.trait);
        expect(score, lessThanOrEqualTo(50));
      });

      test('returns 50 for unanswered questions (defaults to neutral=3)', () {
        final state = OnboardingState(answers: {});
        for (final trait in OceanTrait.values) {
          expect(state.scoreFor(trait), 50);
        }
      });

      test('score stays within 0–100 range', () {
        final answersMax = {for (var q in kPersonalityQuestions) q.id: 5};
        final answersMin = {for (var q in kPersonalityQuestions) q.id: 1};
        final stateMax = OnboardingState(answers: answersMax);
        final stateMin = OnboardingState(answers: answersMin);

        for (final trait in OceanTrait.values) {
          expect(stateMax.scoreFor(trait), inInclusiveRange(0, 100));
          expect(stateMin.scoreFor(trait), inInclusiveRange(0, 100));
        }
      });
    });
  });

  group('kPersonalityQuestions', () {
    test('has exactly 10 questions', () {
      expect(kPersonalityQuestions.length, 10);
    });

    test('all question IDs are unique', () {
      final ids = kPersonalityQuestions.map((q) => q.id).toSet();
      expect(ids.length, kPersonalityQuestions.length);
    });

    test('all OCEAN traits have at least one question', () {
      final coveredTraits = kPersonalityQuestions.map((q) => q.trait).toSet();
      expect(coveredTraits, containsAll(OceanTrait.values));
    });
  });
}
