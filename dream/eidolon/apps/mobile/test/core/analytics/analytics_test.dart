import 'package:eidolon/core/analytics/analytics.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('daypart', () {
    test('buckets the hour into morning/day/evening/night', () {
      expect(daypart(DateTime(2026, 6, 23, 7)), 'morning');
      expect(daypart(DateTime(2026, 6, 23, 13)), 'day');
      expect(daypart(DateTime(2026, 6, 23, 19)), 'evening');
      expect(daypart(DateTime(2026, 6, 23, 2)), 'night');
    });

    test('boundaries land in the expected bucket', () {
      expect(daypart(DateTime(2026, 6, 23, 5)), 'morning'); // inclusive start
      expect(daypart(DateTime(2026, 6, 23, 11)), 'day');
      expect(daypart(DateTime(2026, 6, 23, 17)), 'evening');
      expect(daypart(DateTime(2026, 6, 23, 22)), 'night');
    });
  });

  group('referralCodeFor', () {
    test('is an 8-char, dash-free, lowercase code', () {
      final code = referralCodeFor('AA883CB5-7AF2-4D0C-B759-F868DB13421A');
      expect(code, 'aa883cb5');
      expect(code.length, 8);
      expect(code.contains('-'), isFalse);
    });

    test('is stable for the same uid', () {
      const uid = 'abc12345-0000-0000-0000-000000000000';
      expect(referralCodeFor(uid), referralCodeFor(uid));
    });

    test('pads short ids so the code is always 8 chars', () {
      expect(referralCodeFor('ab').length, 8);
    });
  });

  test('inviteLink embeds the referral code', () {
    expect(
      inviteLink('AA883CB5-7AF2-4D0C-B759-F868DB13421A'),
      'https://eidolon.app/i?r=aa883cb5',
    );
  });

  test('NoopAnalytics never throws', () {
    const a = NoopAnalytics();
    expect(
      () {
        a.identify('u1', props: {'language': 'ja'});
        a.track(AppEvents.appOpened, props: {'daypart': 'morning'});
        a.reset();
      },
      returnsNormally,
    );
  });
}
