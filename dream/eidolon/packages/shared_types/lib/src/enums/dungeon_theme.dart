enum DungeonTheme {
  forest,
  cave,
  ruins,
  void_,
  oceanDepth,
  skyCitadel,
  shadowRealm,
  crystalMaze;

  String get dbValue => switch (this) {
    DungeonTheme.void_ => 'void',
    DungeonTheme.oceanDepth => 'ocean_depth',
    DungeonTheme.skyCitadel => 'sky_citadel',
    DungeonTheme.shadowRealm => 'shadow_realm',
    DungeonTheme.crystalMaze => 'crystal_maze',
    _ => name,
  };

  static DungeonTheme fromString(String value) => switch (value) {
    'void' => DungeonTheme.void_,
    'ocean_depth' => DungeonTheme.oceanDepth,
    'sky_citadel' => DungeonTheme.skyCitadel,
    'shadow_realm' => DungeonTheme.shadowRealm,
    'crystal_maze' => DungeonTheme.crystalMaze,
    _ => DungeonTheme.values.firstWhere((t) => t.name == value),
  };
}
