enum EmotionType {
  happy,
  neutral,
  anxious,
  tired,
  energized,
  sad,
  focused,
  excited;

  // Maps to Big Five neuroticism influence (–1.0 to +1.0)
  double get neuroticismDelta => switch (this) {
    EmotionType.happy => -0.1,
    EmotionType.neutral => 0.0,
    EmotionType.anxious => 0.2,
    EmotionType.tired => 0.1,
    EmotionType.energized => -0.15,
    EmotionType.sad => 0.15,
    EmotionType.focused => -0.05,
    EmotionType.excited => -0.05,
  };

  static EmotionType fromString(String value) =>
      EmotionType.values.firstWhere((e) => e.name == value);
}
