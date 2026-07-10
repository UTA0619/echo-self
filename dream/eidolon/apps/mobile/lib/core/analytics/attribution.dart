import 'package:eidolon/core/analytics/analytics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Install-attribution seam — the plug point for deferred deep links so a fresh
/// install can be traced back to the referral code in the sharer's invite link
/// (`inviteLink(uid)`), closing the viral-K loop's install side.
///
/// The concrete source is swappable and injected via [attributionProvider]:
///  - AppsFlyer / Branch  → resolve from their conversion-data callback
///  - Play Install Referrer (Android) → parse the store `referrer` string
///  - Noop (default)      → organic install, no referral
///
/// Keeping it behind this interface means the app ships attribution-ready and a
/// provider needs only supply the referral code — no code changes to activate.
abstract interface class Attribution {
  /// Returns the referral code the install was attributed to, or null for an
  /// organic install. Implementations should AWAIT their attribution result
  /// (e.g. AppsFlyer's async conversion callback) before completing.
  Future<String?> resolveReferralCode();
}

/// Default: every install is organic. Safe for demo/tests and any build without
/// an attribution SDK wired.
class NoopAttribution implements Attribution {
  const NoopAttribution();

  @override
  Future<String?> resolveReferralCode() async => null;
}

/// Overridden in `main.dart` once an attribution source is configured.
final attributionProvider =
    Provider<Attribution>((ref) => const NoopAttribution());

/// Pulls a valid referral code out of raw attribution data — either a full
/// invite URL (`https://eidolon.app/i?r=<code>`), a bare `r=<code>` referrer
/// string, or the code itself. Returns null when nothing valid is present, so a
/// malformed or organic value never fires a bogus attribution.
String? parseReferralCode(String? raw) {
  if (raw == null) return null;
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;

  bool valid(String s) => RegExp(r'^[a-z0-9]{8}$').hasMatch(s);

  // Bare code.
  if (valid(trimmed)) return trimmed;

  // A URL with ?r=<code> (or an encoded/opaque referrer that contains r=<code>).
  final fromUri = Uri.tryParse(trimmed)?.queryParameters['r'];
  if (fromUri != null && valid(fromUri)) return fromUri;

  // Fallback: a referrer blob like "r=abcd1234&utm_source=...".
  final m = RegExp(r'(?:^|[?&])r=([a-z0-9]{8})(?:$|[&])').firstMatch(trimmed);
  return m?.group(1);
}

/// Runs the one-time install-attribution resolution: asks the [Attribution]
/// source for a referral code and, if valid, fires [AppEvents.installReferred].
/// Persistence of the "already resolved" flag is owned by the caller (via
/// [alreadyResolved]/[onResolved]) so this stays unit-testable without plugins.
class AttributionResolver {
  const AttributionResolver({
    required Attribution attribution,
    required Analytics analytics,
  })  : _attribution = attribution,
        _analytics = analytics;

  final Attribution _attribution;
  final Analytics _analytics;

  Future<void> run({
    required bool alreadyResolved,
    required Future<void> Function() onResolved,
  }) async {
    if (alreadyResolved) return;

    String? raw;
    try {
      raw = await _attribution.resolveReferralCode();
    } catch (_) {
      raw = null; // attribution must never block or crash startup
    }

    final code = parseReferralCode(raw);
    if (code != null) {
      _analytics.track(AppEvents.installReferred, props: {'referrer': code});
    }
    // Mark resolved even when organic so we only attempt once per install.
    await onResolved();
  }
}
