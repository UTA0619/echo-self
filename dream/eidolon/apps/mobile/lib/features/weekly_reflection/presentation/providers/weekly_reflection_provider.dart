import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/weekly_reflection/data/repositories/weekly_reflection_repository_impl.dart';
import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';
import 'package:eidolon/features/weekly_reflection/domain/repositories/weekly_reflection_repository.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'weekly_reflection_provider.freezed.dart';
part 'weekly_reflection_provider.g.dart';

@freezed
abstract class WeeklyReflectionState with _$WeeklyReflectionState {
  const factory WeeklyReflectionState({
    WeeklyReflection? reflection,
    @Default(false) bool isLoading,
    @Default(false) bool isGenerating,
    @Default(true) bool eligible,
    String? errorMessage,
  }) = _WeeklyReflectionState;

  const WeeklyReflectionState._();

  /// True when there is an unseen reflection worth surfacing on the home screen.
  bool get hasUnseen => reflection != null && !reflection!.seen;
}

@riverpod
class WeeklyReflectionNotifier extends _$WeeklyReflectionNotifier {
  @override
  WeeklyReflectionState build() => const WeeklyReflectionState();

  WeeklyReflectionRepository get _repo =>
      ref.read(weeklyReflectionRepositoryProvider);

  /// Fetch the latest unseen reflection (called on home load).
  Future<void> loadLatest() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await _repo.getLatestUnseen();
    state = result.isSuccess
        ? state.copyWith(isLoading: false, reflection: result.value)
        : state.copyWith(isLoading: false, errorMessage: _msg(result.error!));
  }

  /// Mark the current reflection read and drop it from state.
  Future<void> markSeen() async {
    final current = state.reflection;
    if (current == null) return;
    final result = await _repo.markSeen(current.id);
    if (result.isSuccess) {
      state = state.copyWith(reflection: null);
    } else {
      state = state.copyWith(errorMessage: _msg(result.error!));
    }
  }

  /// On-demand generation (paid-tier). Sets [eligible] false for free users so
  /// the UI can offer an upgrade instead of pretending. Re-entry guarded.
  Future<void> generateNow() async {
    if (state.isGenerating) return;
    state = state.copyWith(isGenerating: true, errorMessage: null);
    final result = await _repo.generateNow();
    if (!result.isSuccess) {
      state = state.copyWith(
        isGenerating: false,
        errorMessage: _msg(result.error!),
      );
      return;
    }
    if (!result.value!.eligible) {
      state = state.copyWith(isGenerating: false, eligible: false);
      return;
    }
    await loadLatest();
    state = state.copyWith(isGenerating: false, eligible: true);
  }

  void clearError() => state = state.copyWith(errorMessage: null);

  static String _msg(AppError error) => switch (error) {
        NetworkError(:final message) => message,
        AuthError(:final message) => message,
        AiError(:final message) => message,
        _ => error.toString(),
      };
}
