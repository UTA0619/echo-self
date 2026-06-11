enum EidolonMood {
  calm,
  excited,
  anxious,
  tired,
  focused,
  melancholic;

  static EidolonMood fromString(String value) =>
      EidolonMood.values.firstWhere((m) => m.name == value);
}
