import 'package:freezed_annotation/freezed_annotation.dart';

part 'big_five_question.freezed.dart';

enum OceanTrait {
  openness,
  conscientiousness,
  extraversion,
  agreeableness,
  neuroticism
}

/// One item in the Big Five personality assessment.
/// [reversed] = true means high score → low trait value.
@freezed
abstract class BigFiveQuestion with _$BigFiveQuestion {
  const factory BigFiveQuestion({
    required int id,
    required String text,
    required OceanTrait trait,
    @Default(false) bool reversed,
  }) = _BigFiveQuestion;
}

/// The canonical 10-question mini-IPIP Big Five battery used during onboarding.
const kPersonalityQuestions = [
  BigFiveQuestion(
    id: 0,
    text: 'I enjoy exploring new ideas and experiences.',
    trait: OceanTrait.openness,
  ),
  BigFiveQuestion(
    id: 1,
    text: 'I prefer routine over novelty.',
    trait: OceanTrait.openness,
    reversed: true,
  ),
  BigFiveQuestion(
    id: 2,
    text: 'I complete tasks thoroughly and on schedule.',
    trait: OceanTrait.conscientiousness,
  ),
  BigFiveQuestion(
    id: 3,
    text: 'I often leave things unfinished.',
    trait: OceanTrait.conscientiousness,
    reversed: true,
  ),
  BigFiveQuestion(
    id: 4,
    text: 'I love meeting and talking to new people.',
    trait: OceanTrait.extraversion,
  ),
  BigFiveQuestion(
    id: 5,
    text: 'I prefer quiet time alone over social gatherings.',
    trait: OceanTrait.extraversion,
    reversed: true,
  ),
  BigFiveQuestion(
    id: 6,
    text: 'I genuinely care about others\' wellbeing.',
    trait: OceanTrait.agreeableness,
  ),
  BigFiveQuestion(
    id: 7,
    text: 'I can be critical and demanding of others.',
    trait: OceanTrait.agreeableness,
    reversed: true,
  ),
  BigFiveQuestion(
    id: 8,
    text: 'I stay calm under pressure.',
    trait: OceanTrait.neuroticism,
    reversed: true,
  ),
  BigFiveQuestion(
    id: 9,
    text: 'I worry easily and feel anxious often.',
    trait: OceanTrait.neuroticism,
  ),
];
