enum RunStatus {
  inProgress,
  completed,
  failed,
  abandoned;

  static RunStatus fromString(String value) => switch (value) {
    'in_progress' => RunStatus.inProgress,
    'completed' => RunStatus.completed,
    'failed' => RunStatus.failed,
    'abandoned' => RunStatus.abandoned,
    _ => throw ArgumentError('Unknown RunStatus: $value'),
  };
}
