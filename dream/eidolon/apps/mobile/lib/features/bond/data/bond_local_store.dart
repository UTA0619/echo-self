import 'package:shared_preferences/shared_preferences.dart';

/// Local store for the player↔Eidolon bond points. Local-only for now — the
/// relationship is the differentiator, so server-persisting it is a follow-on.
class BondLocalStore {
  static const _kPoints = 'bond.points';

  Future<int> read() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_kPoints) ?? 0;
  }

  Future<void> write(int points) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kPoints, points);
  }
}
