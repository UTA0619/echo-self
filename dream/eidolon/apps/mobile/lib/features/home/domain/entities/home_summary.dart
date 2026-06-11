class HomeSummary {
  const HomeSummary({
    required this.dungeonRunsToday,
    required this.currentStreak,
    required this.hasActiveRun,
    this.activeRunId,
  });

  final int dungeonRunsToday;
  final int currentStreak;
  final bool hasActiveRun;
  final String? activeRunId;

  static const empty = HomeSummary(
    dungeonRunsToday: 0,
    currentStreak: 0,
    hasActiveRun: false,
  );
}
