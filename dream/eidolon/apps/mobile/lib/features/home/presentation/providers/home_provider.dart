import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/eidolon/domain/usecases/get_eidolon_usecase.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/domain/usecases/get_home_summary_usecase.dart';
import 'package:eidolon/features/home/domain/usecases/get_player_profile_usecase.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_types/shared_types.dart';

part 'home_provider.freezed.dart';
part 'home_provider.g.dart';

@freezed
abstract class HomeState with _$HomeState {
  const factory HomeState({
    PlayerProfile? player,
    EidolonProfile? eidolon,
    HomeSummary? summary,
    @Default(false) bool isLoading,
    String? errorMessage,
  }) = _HomeState;
}

@riverpod
class HomeNotifier extends _$HomeNotifier {
  @override
  HomeState build() => const HomeState();

  Future<void> load(String authUid) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final playerResult =
        await ref.read(getPlayerProfileUseCaseProvider).call(authUid);

    if (!playerResult.isSuccess) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _errorMsg(playerResult.error!),
      );
      return;
    }

    final player = playerResult.value!;
    final eidolonResult = await ref.read(getEidolonUseCaseProvider).call();

    HomeSummary? summary;
    if (eidolonResult.isSuccess) {
      final summaryResult = await ref
          .read(getHomeSummaryUseCaseProvider)
          .call(eidolonResult.value!.id);
      if (summaryResult.isSuccess) summary = summaryResult.value;
    }

    // A missing Eidolon (before onboarding) is a normal state, not an error —
    // show the "not yet awakened" card without a red error banner.
    final eidolonMissing = eidolonResult.error is NotFoundError;
    state = state.copyWith(
      isLoading: false,
      player: player,
      eidolon: eidolonResult.isSuccess ? eidolonResult.value : null,
      summary: summary,
      errorMessage: (eidolonResult.isSuccess || eidolonMissing)
          ? null
          : _errorMsg(eidolonResult.error!),
    );
  }

  void clearError() => state = state.copyWith(errorMessage: null);

  static String _errorMsg(AppError error) => switch (error) {
        NetworkError(:final message) => message,
        AuthError(:final message) => message,
        AiError(:final message) => message,
        _ => error.toString(),
      };
}
