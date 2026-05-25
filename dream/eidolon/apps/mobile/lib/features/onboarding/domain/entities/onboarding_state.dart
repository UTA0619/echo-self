import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'onboarding_state.freezed.dart';

@freezed
abstract class OnboardingState with _$OnboardingState {
  const OnboardingState._();

  const factory OnboardingState({
    @Default(0) int currentStep,
    @Default('') String username,
    @Default('') String eidolonName,
    @Default({}) Map<int, int> answers,
    @Default(false) bool isSubmitting,
    @Default(false) bool isComplete,
    String? errorMessage,
  }) = _OnboardingState;

  int scoreFor(OceanTrait trait) {
    final questions = kPersonalityQuestions.where((q) => q.trait == trait).toList();
    if (questions.isEmpty) return 50;
    final rawSum = questions.fold<int>(0, (sum, q) {
      final raw = answers[q.id] ?? 3;
      return sum + (q.reversed ? (6 - raw) : raw);
    });
    final avg = rawSum / questions.length;
    return ((avg - 1) / 4 * 100).round().clamp(0, 100);
  }

  bool get canProceedStep0 => true;
  bool get canProceedStep1 => username.trim().length >= 3;
  bool get canProceedStep2 => answers.length >= 10;
  bool get canProceedStep3 => eidolonName.trim().isNotEmpty;
}
