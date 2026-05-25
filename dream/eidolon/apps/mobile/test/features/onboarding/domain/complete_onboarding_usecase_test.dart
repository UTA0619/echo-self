import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:flutter_test/flutter_test.dart';

// Tests for CompleteOnboardingUseCase logic that doesn't require a live DB.
// Supabase DB interaction is covered by integration / E2E tests.

void main() {
  // Verify the Result<void> fix: ok(null) must be considered a success.
  group('Result<void> — isSuccess', () {
    test('ok(null) is a success', () {
      final Result<void> r = ok(null);
      expect(r.isSuccess, true);
    });

    test('err(...) is not a success', () {
      final Result<void> r = err(const AppError.auth(message: 'oops'));
      expect(r.isSuccess, false);
    });

    test('ok(value) with non-null value is a success', () {
      final Result<int> r = ok(42);
      expect(r.isSuccess, true);
    });
  });

  group('OnboardingState.scoreFor', () {
    test('all neutral answers → score 50 for every trait', () {
      final state = OnboardingState(
        answers: {for (final q in kPersonalityQuestions) q.id: 3},
      );
      for (final trait in OceanTrait.values) {
        expect(
          state.scoreFor(trait),
          50,
          reason: 'Expected 50 for $trait with all-neutral answers',
        );
      }
    });

    test('scores stay within 0–100 for extreme answers', () {
      for (final v in [1, 5]) {
        final state = OnboardingState(
          answers: {for (final q in kPersonalityQuestions) q.id: v},
        );
        for (final trait in OceanTrait.values) {
          expect(state.scoreFor(trait), inInclusiveRange(0, 100));
        }
      }
    });

    test('reversed items invert contribution', () {
      final reversed = kPersonalityQuestions.where((q) => q.reversed).toList();
      if (reversed.isEmpty) return;

      final q = reversed.first;
      final state = OnboardingState(
        answers: {
          for (final question in kPersonalityQuestions)
            question.id: question.id == q.id ? 5 : 3,
        },
      );
      // Reversed item answered 5 → contributes as 1 → pulls trait below 50
      expect(state.scoreFor(q.trait), lessThanOrEqualTo(50));
    });

    test('unanswered questions default to neutral (score = 50)', () {
      final state = const OnboardingState();
      for (final trait in OceanTrait.values) {
        expect(state.scoreFor(trait), 50);
      }
    });
  });
}
