import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_error.freezed.dart';

@freezed
class AppError with _$AppError {
  const factory AppError.network({
    required String message,
    int? statusCode,
  }) = NetworkError;

  const factory AppError.auth({
    required String message,
  }) = AuthError;

  const factory AppError.notFound({
    required String resource,
  }) = NotFoundError;

  const factory AppError.ai({
    required String message,
    required AiFallbackLevel fallbackLevel,
  }) = AiError;

  const factory AppError.storage({
    required String message,
  }) = StorageError;

  const factory AppError.unknown({
    required Object error,
    StackTrace? stackTrace,
  }) = UnknownError;

  /// Firebase requires a recent sign-in before sensitive operations like
  /// account deletion. The UI should prompt the user to re-authenticate.
  const factory AppError.requiresRecentLogin() = RequiresRecentLoginError;
}

enum AiFallbackLevel { claude, gpt4oMini, localTemplate }

typedef Result<T> = ({T? value, AppError? error});

extension ResultExtension<T> on Result<T> {
  bool get isSuccess => error == null;
  bool get isFailure => error != null;

  R when<R>({
    required R Function(T value) success,
    required R Function(AppError error) failure,
  }) {
    if (isSuccess) return success(value as T);
    return failure(error!);
  }
}

Result<T> ok<T>(T value) => (value: value, error: null);
Result<T> err<T>(AppError error) => (value: null, error: error);
