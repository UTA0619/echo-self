import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/away_report/data/away_report_local_store.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'away_report_provider.freezed.dart';
part 'away_report_provider.g.dart';

const _minAwayHours = 3;
const _capHours = 12;

/// Idle crystals for [hours] away — capped so it rewards a return without
/// trivialising active play.
int awayCrystals(double hours) => (hours.clamp(0, _capHours) * 6).round();

/// Flavour: how many foes Nova bested while you were gone.
int awayEnemies(double hours) => (hours.clamp(0, _capHours) * 2).round();

@freezed
abstract class AwayReportState with _$AwayReportState {
  const factory AwayReportState({
    @Default(false) bool claimable,
    @Default(0) int hours,
    @Default(0) int crystals,
    @Default(0) int enemies,
    @Default(false) bool isClaiming,
  }) = _AwayReportState;
}

@riverpod
class AwayReportNotifier extends _$AwayReportNotifier {
  final _store = AwayReportLocalStore();

  @override
  Future<AwayReportState> build() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    int? lastSeen;
    try {
      lastSeen = await _store.readLastSeen();
    } catch (_) {
      return const AwayReportState();
    }
    if (lastSeen == null) {
      await _touch(now);
      return const AwayReportState();
    }
    final hours = (now - lastSeen) / 3600000;
    if (hours < _minAwayHours) {
      await _touch(now);
      return const AwayReportState();
    }
    return AwayReportState(
      claimable: true,
      hours: hours.clamp(0, _capHours).round(),
      crystals: awayCrystals(hours),
      enemies: awayEnemies(hours),
    );
  }

  Future<void> claim() async {
    final s = state.valueOrNull;
    if (s == null || !s.claimable || s.isClaiming) return;
    state = AsyncData(s.copyWith(isClaiming: true));

    final now = DateTime.now().millisecondsSinceEpoch;
    final authUid = ref.read(authNotifierProvider).user?.uid;
    if (authUid != null) {
      final client = ref.read(supabaseClientProvider);
      try {
        final row = await client
            .from('users')
            .select('id')
            .eq('auth_uid', authUid)
            .maybeSingle();
        final uid = row?['id'] as String?;
        if (uid != null) {
          await client.rpc<void>(
            'credit_crystals',
            params: {
              'p_user_id': uid,
              'p_amount': s.crystals,
              'p_receipt_id': 'away-$now',
            },
          );
        }
      } catch (_) {
        // Best-effort; the away window still resets below.
      }
    }
    await _touch(now);
    state = AsyncData(s.copyWith(claimable: false, isClaiming: false));
  }

  Future<void> _touch(int now) async {
    try {
      await _store.writeLastSeen(now);
    } catch (_) {}
  }
}
