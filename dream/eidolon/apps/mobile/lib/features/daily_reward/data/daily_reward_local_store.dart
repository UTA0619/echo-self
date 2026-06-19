import 'package:shared_preferences/shared_preferences.dart';

/// Local record of the daily-login streak — when the player last claimed and
/// how many consecutive days they've shown up. Local-only is fine for a
/// retention nudge (server-authoritative dailies can come later).
class DailyRewardLocalStore {
  static const _kLastClaim = 'daily_reward.last_claim';
  static const _kStreak = 'daily_reward.streak';

  Future<({String? lastClaim, int streak})> read() async {
    final prefs = await SharedPreferences.getInstance();
    return (
      lastClaim: prefs.getString(_kLastClaim),
      streak: prefs.getInt(_kStreak) ?? 0,
    );
  }

  Future<void> write({required String day, required int streak}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLastClaim, day);
    await prefs.setInt(_kStreak, streak);
  }

  /// Today as a local `YYYY-MM-DD` key.
  static String dayKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}
