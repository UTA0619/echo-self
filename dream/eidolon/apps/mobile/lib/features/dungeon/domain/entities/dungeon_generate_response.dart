import 'package:shared_types/shared_types.dart';

class DungeonGenerateResult {
  const DungeonGenerateResult({
    required this.dungeon,
    required this.modelUsed,
    required this.generationMs,
  });

  final Dungeon dungeon;
  final String modelUsed;
  final int generationMs;
}
