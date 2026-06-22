import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';

/// Thin analytics seam so features never touch Mixpanel directly. Swap the
/// provider override in tests/demo for [NoopAnalytics]. Every call is guarded —
/// analytics must never crash the app or block a user action.
abstract interface class Analytics {
  /// Tie subsequent events to a stable user id (call on auth). Optional people
  /// properties are set on the user profile.
  void identify(String distinctId, {Map<String, Object?>? props});

  /// Record an event. Use the [AppEvents] constants for names.
  void track(String event, {Map<String, Object?>? props});

  /// Clear identity on sign-out so the next user is a fresh distinct id.
  void reset();
}

/// Default — does nothing. Used in tests, demo builds, and when no Mixpanel
/// token was injected.
class NoopAnalytics implements Analytics {
  const NoopAnalytics();

  @override
  void identify(String distinctId, {Map<String, Object?>? props}) {}

  @override
  void track(String event, {Map<String, Object?>? props}) {}

  @override
  void reset() {}
}

/// Mixpanel-backed analytics. All calls are wrapped so a tracking failure is
/// swallowed (logged by Mixpanel itself) rather than surfacing to the user.
class MixpanelAnalytics implements Analytics {
  const MixpanelAnalytics(this._mp);
  final Mixpanel _mp;

  @override
  void identify(String distinctId, {Map<String, Object?>? props}) {
    try {
      _mp.identify(distinctId);
      if (props != null && props.isNotEmpty) {
        final people = _mp.getPeople();
        props.forEach((k, v) => people.set(k, v));
      }
    } catch (_) {/* never let analytics break a flow */}
  }

  @override
  void track(String event, {Map<String, Object?>? props}) {
    try {
      _mp.track(
        event,
        properties: props == null ? null : Map<String, dynamic>.from(props),
      );
    } catch (_) {/* swallow */}
  }

  @override
  void reset() {
    try {
      _mp.reset();
    } catch (_) {/* swallow */}
  }
}

/// Overridden in `main.dart` with [MixpanelAnalytics] once Mixpanel is ready.
/// Defaults to no-op so widget tests and demo builds need no setup.
final analyticsProvider = Provider<Analytics>((ref) => const NoopAnalytics());

/// Canonical event names. The three growth metrics this instruments:
///   1. Retention (D1/D7)      — [appOpened] cohorts by distinct id
///   2. Morning return habit   — [morningReportViewed] / [overnightDispatchTapped]
///   3. Viral coefficient (K)  — [morningShareInitiated] → [morningShareCompleted]
class AppEvents {
  const AppEvents._();

  static const appOpened = 'app_opened';
  static const morningReportViewed = 'morning_report_viewed';
  static const overnightDispatchTapped = 'overnight_dispatch_tapped';
  static const morningShareInitiated = 'morning_share_initiated';
  static const morningShareCompleted = 'morning_share_completed';
}

/// Coarse time-of-day bucket, attached to [AppEvents.appOpened] so the
/// "do they come back the next *morning*" cohort can be sliced out.
String daypart([DateTime? now]) {
  final h = (now ?? DateTime.now()).hour;
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

/// Short, stable invite code derived from a user id — the carrier for viral
/// attribution. Goes in the shared link so installs can be traced back to the
/// sharer (the install side still needs deep-link/store-referrer wiring).
String referralCodeFor(String uid) =>
    uid.replaceAll('-', '').toLowerCase().padRight(8, '0').substring(0, 8);

/// The invite link embedded in a shared Morning Report.
String inviteLink(String uid) => 'https://eidolon.app/i?r=${referralCodeFor(uid)}';
