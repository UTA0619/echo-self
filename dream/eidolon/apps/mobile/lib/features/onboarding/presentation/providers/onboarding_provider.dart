import 'package:eidolon/core/analytics/analytics.dart';
import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:eidolon/features/onboarding/domain/usecases/complete_onboarding_usecase.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'onboarding_provider.g.dart';

@riverpod
class OnboardingNotifier extends _$OnboardingNotifier {
  @override
  OnboardingState build() => const OnboardingState();

  void setUsername(String value) =>
      state = state.copyWith(username: value, errorMessage: null);

  void setEidolonName(String value) =>
      state = state.copyWith(eidolonName: value, errorMessage: null);

  void setAnswer(int questionId, int likertValue) => state = state.copyWith(
        answers: {...state.answers, questionId: likertValue},
        errorMessage: null,
      );

  void nextStep() {
    if (state.currentStep < 3) {
      state = state.copyWith(
        currentStep: state.currentStep + 1,
        errorMessage: null,
      );
    }
  }

  void previousStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(
        currentStep: state.currentStep - 1,
        errorMessage: null,
      );
    }
  }

  Future<void> complete() async {
    final authUid = ref.read(authNotifierProvider).user?.uid;
    if (authUid == null) {
      state = state.copyWith(
        errorMessage: 'Not signed in. Please restart the app.',
      );
      return;
    }

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    final useCase = ref.read(completeOnboardingUseCaseProvider);
    final Result<void> result = await useCase(state, authUid: authUid);

    if (result.isSuccess) {
      // Activation: identify the user and mark the moment they awakened their
      // Eidolon — the anchor for D1/D7/D30 retention cohorts.
      ref.read(analyticsProvider)
        ..identify(authUid)
        ..track(
          AppEvents.eidolonAwakened,
          props: {'answered': state.answers.length},
        );
      state = state.copyWith(isSubmitting: false, isComplete: true);
    } else {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: switch (result.error!) {
          NetworkError(:final message) => message,
          AuthError(:final message) => message,
          NotFoundError(:final resource) => '$resource not found',
          AiError(:final message) => message,
          StorageError(:final message) => message,
          UnknownError(:final error) => error.toString(),
          _ => result.error!.toString(),
        },
      );
    }
  }
}
