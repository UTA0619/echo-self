import 'package:eidolon/core/analytics/analytics.dart';
import 'package:eidolon/core/analytics/attribution.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingAnalytics implements Analytics {
  final events = <({String name, Map<String, Object?>? props})>[];

  @override
  void track(String event, {Map<String, Object?>? props}) =>
      events.add((name: event, props: props));

  @override
  void identify(String distinctId, {Map<String, Object?>? props}) {}

  @override
  void reset() {}
}

class _FakeAttribution implements Attribution {
  _FakeAttribution(this._value, {this.throws = false});
  final String? _value;
  final bool throws;

  @override
  Future<String?> resolveReferralCode() async {
    if (throws) throw Exception('sdk down');
    return _value;
  }
}

void main() {
  group('parseReferralCode', () {
    test('accepts a bare 8-char code', () {
      expect(parseReferralCode('aa883cb5'), 'aa883cb5');
    });

    test('extracts from a full invite URL', () {
      expect(
        parseReferralCode('https://eidolon.app/i?r=aa883cb5'),
        'aa883cb5',
      );
    });

    test('extracts from a referrer blob', () {
      expect(
        parseReferralCode('r=aa883cb5&utm_source=share'),
        'aa883cb5',
      );
    });

    test('rejects null, empty, and malformed values', () {
      expect(parseReferralCode(null), isNull);
      expect(parseReferralCode(''), isNull);
      expect(parseReferralCode('  '), isNull);
      expect(parseReferralCode('NOTACODE'), isNull); // uppercase / too long
      expect(parseReferralCode('abc'), isNull); // too short
      expect(parseReferralCode('https://eidolon.app/i?r=xyz'), isNull);
    });
  });

  group('AttributionResolver', () {
    test('fires install_referred with a valid referral, then marks resolved',
        () async {
      final analytics = _RecordingAnalytics();
      var resolved = false;
      await AttributionResolver(
        attribution: _FakeAttribution('https://eidolon.app/i?r=aa883cb5'),
        analytics: analytics,
      ).run(alreadyResolved: false, onResolved: () async => resolved = true);

      expect(analytics.events.single.name, AppEvents.installReferred);
      expect(analytics.events.single.props?['referrer'], 'aa883cb5');
      expect(resolved, isTrue);
    });

    test('organic install fires nothing but still marks resolved', () async {
      final analytics = _RecordingAnalytics();
      var resolved = false;
      await AttributionResolver(
        attribution: _FakeAttribution(null),
        analytics: analytics,
      ).run(alreadyResolved: false, onResolved: () async => resolved = true);

      expect(analytics.events, isEmpty);
      expect(resolved, isTrue); // only attempt once per install
    });

    test('skips entirely when already resolved', () async {
      final analytics = _RecordingAnalytics();
      var marked = false;
      await AttributionResolver(
        attribution: _FakeAttribution('aa883cb5'),
        analytics: analytics,
      ).run(alreadyResolved: true, onResolved: () async => marked = true);

      expect(analytics.events, isEmpty);
      expect(marked, isFalse);
    });

    test('a throwing attribution source never crashes; marks resolved',
        () async {
      final analytics = _RecordingAnalytics();
      var resolved = false;
      await AttributionResolver(
        attribution: _FakeAttribution(null, throws: true),
        analytics: analytics,
      ).run(alreadyResolved: false, onResolved: () async => resolved = true);

      expect(analytics.events, isEmpty);
      expect(resolved, isTrue);
    });
  });
}
