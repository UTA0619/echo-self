enum MemoryType {
  episodic,
  semantic,
  procedural;

  static MemoryType fromString(String value) =>
      MemoryType.values.firstWhere((m) => m.name == value);
}
