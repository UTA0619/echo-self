import 'package:shared_preferences/shared_preferences.dart';

/// Tracks when the player was last active, so we can reward time spent away —
/// the "Nova adventured while you slept" idle hook. Client-side for now; a true
/// server-driven autonomous run (cron) is a follow-on.
class AwayReportLocalStore {
  static const _kLastSeen = 'away_report.last_seen_ms';

  Future<int?> readLastSeen() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_kLastSeen);
  }

  Future<void> writeLastSeen(int epochMs) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kLastSeen, epochMs);
  }
}
