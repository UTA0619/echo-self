/// A weekly "what I noticed about you" reflection — the Twin mirroring the user's
/// week back to them (STRATEGY Act 2). Mirrors a row of `weekly_reflections`.
class WeeklyReflection {
  const WeeklyReflection({
    required this.id,
    required this.weekStart,
    required this.reflection,
    required this.observation,
    required this.nudge,
    required this.seen,
  });

  final String id;
  final DateTime weekStart;

  /// 2–4 warm sentences reflecting the week back.
  final String reflection;

  /// One specific, grounded thing the Twin noticed.
  final String observation;

  /// An optional gentle invitation — empty when nothing fit.
  final String nudge;

  final bool seen;

  bool get hasNudge => nudge.trim().isNotEmpty;
}
