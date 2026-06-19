import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/daily_reward/data/daily_reward_local_store.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'daily_reward_provider.freezed.dart';
part 'daily_reward_provider.g.dart';

/// Crystals for a daily login on day [streakDay] of the streak — grows for a
/// week then plateaus, so showing up every day is the rewarding habit.
int dailyRewardCrystals(int streakDay) => 30 + streakDay.clamp(1, 7) * 10;

@freezed
abstract class DailyRewardState with _$DailyRewardState {
  const factory DailyRewardState({
    @Default(false) bool claimable,
    @Default(1) int streakDay,
    @Default(0) int reward,
    @Default(false) bool isClaiming,
  }) = _DailyRewardState;
}

@riverpod
class DailyRewardNotifier extends _$DailyRewardNotifier {
  final _store = DailyRewardLocalStore();

  @override
  Future<DailyRewardState> build() async {
    final rec = await _store.read();
    final now = DateTime.now();
    final today = DailyRewardLocalStore.dayKey(now);
    if (rec.lastClaim == today) {
      return const DailyRewardState();
    }
    final yesterday = DailyRewardLocalStore.dayKey(
      now.subtract(const Duration(days: 1)),
    );
    final streakDay = rec.lastClaim == yesterday ? rec.streak + 1 : 1;
    return DailyRewardState(
      claimable: true,
      streakDay: streakDay,
      reward: dailyRewardCrystals(streakDay),
    );
  }

  Future<void> claim() async {
    final s = state.valueOrNull;
    if (s == null || !s.claimable || s.isClaiming) return;
    state = AsyncData(s.copyWith(isClaiming: true));

    final today = DailyRewardLocalStore.dayKey(DateTime.now());
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
              'p_amount': s.reward,
              'p_receipt_id': 'daily-$today',
            },
          );
        }
      } catch (_) {
        // Crediting is best-effort; the streak still advances locally.
      }
    }

    await _store.write(day: today, streak: s.streakDay);
    state = AsyncData(s.copyWith(claimable: false, isClaiming: false));
  }
}
