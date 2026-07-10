import 'package:eidolon/features/bond/data/bond_local_store.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'bond_provider.g.dart';

const _bondPerLevel = 60;

/// Bond level from accumulated points — every interaction nudges it up.
int bondLevel(int points) => (1 + points ~/ _bondPerLevel).clamp(1, 20);

/// Progress (0–1) toward the next bond level.
double bondProgress(int points) => (points % _bondPerLevel) / _bondPerLevel;

/// Relationship tier (0=stranger … 4=soulmate) for the given [level].
int bondTierIndex(int level) => level >= 15
    ? 4
    : level >= 10
        ? 3
        : level >= 6
            ? 2
            : level >= 3
                ? 1
                : 0;

/// Tracks how close the player and their Eidolon have grown. Chatting and
/// adventuring together raise it; the home meter makes the relationship — the
/// app's real differentiator — something you can see and want to deepen.
@Riverpod(keepAlive: true)
class BondNotifier extends _$BondNotifier {
  final _store = BondLocalStore();

  @override
  Future<int> build() async {
    try {
      return await _store.read();
    } catch (_) {
      return 0; // storage unavailable (e.g. tests) — start from zero.
    }
  }

  /// Add bond points (e.g. +5 for a chat, +10 for a dungeon run together).
  Future<void> addPoints(int n) async {
    if (n <= 0) return;
    final current = state.valueOrNull ?? 0;
    final next = current + n;
    try {
      await _store.write(next);
    } catch (_) {
      // Persistence is best-effort; keep the in-memory bond responsive.
    }
    state = AsyncData(next);
  }
}
