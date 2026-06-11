enum VisitType {
  passing,
  trade,
  duel,
  memoryShare;

  static VisitType fromString(String value) => switch (value) {
    'passing' => VisitType.passing,
    'trade' => VisitType.trade,
    'duel' => VisitType.duel,
    'memory_share' => VisitType.memoryShare,
    _ => throw ArgumentError('Unknown VisitType: $value'),
  };
}
