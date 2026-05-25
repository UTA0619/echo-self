import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/usecases/get_crystals_usecase.dart';
import 'package:eidolon/features/gacha/domain/usecases/get_pull_history_usecase.dart';
import 'package:eidolon/features/gacha/domain/usecases/pull_gacha_usecase.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'gacha_provider.freezed.dart';
part 'gacha_provider.g.dart';

enum GachaPhase { idle, pulling, revealing, done }

@freezed
abstract class GachaState with _$GachaState {
  const factory GachaState({
    @Default(GachaPhase.idle) GachaPhase phase,
    @Default(0) int crystals,
    GachaPullResult? lastResult,
    @Default([]) List<GachaItem> history,
    @Default(false) bool isLoading,
    String? errorMessage,
  }) = _GachaState;
}

@riverpod
class GachaNotifier extends _$GachaNotifier {
  @override
  GachaState build() {
    Future.microtask(_init);
    return const GachaState(isLoading: true);
  }

  Future<void> _init() async {
    final userId = ref.read(authNotifierProvider).user?.uid;
    if (userId == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    // Load crystals + history in parallel
    final results = await Future.wait([
      ref.read(getCrystalsUseCaseProvider).call(userId),
      ref.read(getPullHistoryUseCaseProvider).call(userId),
    ]);

    final crystalResult = results[0] as Result<int>;
    final historyResult = results[1] as Result<List<GachaItem>>;

    state = state.copyWith(
      isLoading: false,
      crystals: crystalResult.isSuccess ? crystalResult.value! : 0,
      history: historyResult.isSuccess ? historyResult.value! : [],
      errorMessage: crystalResult.isSuccess ? null : _msg(crystalResult.error!),
    );
  }

  Future<void> pull({required int count}) async {
    assert(count == 1 || count == 10);
    final userId = ref.read(authNotifierProvider).user?.uid;
    if (userId == null) return;

    state = state.copyWith(
      phase: GachaPhase.pulling,
      errorMessage: null,
      lastResult: null,
    );

    final result = await ref
        .read(pullGachaUseCaseProvider)
        .call(userId: userId, count: count);

    if (result.isSuccess) {
      final pullResult = result.value!;
      state = state.copyWith(
        phase: GachaPhase.revealing,
        lastResult: pullResult,
        crystals: state.crystals - pullResult.crystalsSpent,
        history: [...pullResult.items, ...state.history].take(30).toList(),
      );
    } else {
      state = state.copyWith(
        phase: GachaPhase.idle,
        errorMessage: _msg(result.error!),
      );
    }
  }

  void finishReveal() => state = state.copyWith(phase: GachaPhase.done);

  void reset() => state = state.copyWith(
        phase: GachaPhase.idle,
        lastResult: null,
        errorMessage: null,
      );

  void clearError() => state = state.copyWith(errorMessage: null);

  static String _msg(AppError e) => switch (e) {
        NetworkError(:final message) => message,
        AuthError(:final message) => message,
        UnknownError(:final error) => error.toString(),
        _ => e.toString(),
      };
}
