import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/reality_sync/data/repositories/reality_sync_repository_impl.dart';
import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';
import 'package:eidolon/features/reality_sync/domain/entities/reality_sync_bonus.dart';
import 'package:eidolon/features/reality_sync/domain/repositories/reality_sync_repository.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'reality_sync_provider.g.dart';
part 'reality_sync_provider.freezed.dart';

@freezed
abstract class RealitySyncState with _$RealitySyncState {
  const factory RealitySyncState({
    @Default(false) bool isLoading,
    @Default(false) bool hasPermission,
    HealthSnapshot? snapshot,
    RealitySyncBonus? bonus,
    String? errorMessage,
  }) = _RealitySyncState;
}

@riverpod
class RealitySyncNotifier extends _$RealitySyncNotifier {
  @override
  RealitySyncState build() {
    Future.microtask(_init);
    return const RealitySyncState(isLoading: true);
  }

  Future<void> _init() async {
    final repo = ref.read(realitySyncRepositoryProvider);
    final perm = await repo.hasPermission();
    if (!perm) {
      state = const RealitySyncState(hasPermission: false);
      return;
    }
    await _fetchAndUpdate(repo);
  }

  Future<void> requestPermissionAndFetch() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final repo = ref.read(realitySyncRepositoryProvider);
    final granted = await repo.requestPermission();
    if (!granted) {
      state = const RealitySyncState(hasPermission: false);
      return;
    }
    await _fetchAndUpdate(repo);
  }

  Future<void> refresh() async {
    if (!state.hasPermission) return;
    state = state.copyWith(isLoading: true, errorMessage: null);
    await _fetchAndUpdate(ref.read(realitySyncRepositoryProvider));
  }

  Future<void> _fetchAndUpdate(RealitySyncRepository repo) async {
    final result = await repo.fetchTodaySnapshot();
    if (result.isSuccess) {
      final snapshot = result.value!;
      state = RealitySyncState(
        hasPermission: true,
        snapshot: snapshot,
        bonus: bonusFromSnapshot(snapshot),
      );
    } else {
      final e = result.error!;
      final is403 = e is NetworkError && e.statusCode == 403;
      final msg = switch (e) {
        NetworkError(:final message) => message,
        AuthError(:final message) => message,
        StorageError(:final message) => message,
        AiError(:final message) => message,
        NotFoundError(:final resource) => 'Not found: $resource',
        UnknownError(:final error) => error.toString(),
        _ => e.toString(),
      };
      state = RealitySyncState(
        hasPermission: !is403,
        errorMessage: msg,
      );
    }
  }
}
