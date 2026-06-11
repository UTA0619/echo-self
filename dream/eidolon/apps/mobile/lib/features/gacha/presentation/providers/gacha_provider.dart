import 'dart:async';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/firebase/firebase_service.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:eidolon/features/gacha/domain/usecases/buy_crystals_usecase.dart';
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
    @Default([]) List<CrystalBundle> bundles,
    @Default(false) bool isLoading,
    @Default(false) bool isBuyingCrystals,
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

    // Load crystals, history and IAP bundles in parallel
    final results = await Future.wait([
      ref.read(getCrystalsUseCaseProvider).call(userId),
      ref.read(getPullHistoryUseCaseProvider).call(userId),
      ref.read(getCrystalBundlesUseCaseProvider).call(),
    ]);

    final crystalResult = results[0] as Result<int>;
    final historyResult = results[1] as Result<List<GachaItem>>;
    final bundleResult = results[2] as Result<List<CrystalBundle>>;

    state = state.copyWith(
      isLoading: false,
      crystals: crystalResult.isSuccess ? crystalResult.value! : 0,
      history: historyResult.isSuccess ? historyResult.value! : [],
      bundles: bundleResult.isSuccess ? bundleResult.value! : [],
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
      // Guarded: analytics must never break the pull flow (e.g. Firebase not
      // initialized in unit tests).
      try {
        unawaited(
          ref.read(firebaseAnalyticsProvider).logEvent(
            name: 'gacha_pull',
            parameters: {
              'count': count,
              'crystals_spent': pullResult.crystalsSpent,
            },
          ),
        );
      } catch (_) {/* analytics unavailable — non-fatal */}
    } else {
      state = state.copyWith(
        phase: GachaPhase.idle,
        errorMessage: _msg(result.error!),
      );
    }
  }

  Future<void> buyCrystals(String productId) async {
    final userId = ref.read(authNotifierProvider).user?.uid;
    if (userId == null) return;

    state = state.copyWith(isBuyingCrystals: true, errorMessage: null);

    final result = await ref
        .read(buyCrystalsUseCaseProvider)
        .call(userId: userId, productId: productId);

    if (result.isSuccess) {
      state = state.copyWith(
        isBuyingCrystals: false,
        crystals: result.value!,
      );
    } else {
      final err = result.error!;
      // Code 0 = user cancelled — no error banner
      final isCancelled = err is NetworkError && (err.statusCode ?? 0) == 0;
      state = state.copyWith(
        isBuyingCrystals: false,
        errorMessage: isCancelled ? null : _msg(err),
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
