import 'package:eidolon/core/error/app_error.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Result helpers', () {
    test('ok() creates a success result', () {
      final result = ok(42);
      expect(result.isSuccess, isTrue);
      expect(result.isFailure, isFalse);
      expect(result.value, equals(42));
      expect(result.error, isNull);
    });

    test('err() creates a failure result', () {
      final error = const AppError.network(message: 'timeout', statusCode: 408);
      final result = err<int>(error);
      expect(result.isSuccess, isFalse);
      expect(result.isFailure, isTrue);
      expect(result.value, isNull);
      expect(result.error, equals(error));
    });

    test('when() calls success branch', () {
      final result = ok('hello');
      final output = result.when(
        success: (v) => 'got: $v',
        failure: (_) => 'failed',
      );
      expect(output, equals('got: hello'));
    });

    test('when() calls failure branch', () {
      final result = err<String>(const AppError.auth(message: 'unauthorized'));
      final output = result.when(
        success: (_) => 'succeeded',
        failure: (e) => 'error: ${e.runtimeType}',
      );
      expect(output, equals('error: AuthError'));
    });
  });

  group('AppError variants', () {
    test('NetworkError holds statusCode', () {
      const error = AppError.network(message: 'bad gateway', statusCode: 502);
      switch (error) {
        case NetworkError(:final message, :final statusCode):
          expect(message, equals('bad gateway'));
          expect(statusCode, equals(502));
        default:
          fail('Expected NetworkError');
      }
    });

    test('AiError tracks fallback level', () {
      const error = AppError.ai(
        message: 'Claude overloaded',
        fallbackLevel: AiFallbackLevel.gpt4oMini,
      );
      switch (error) {
        case AiError(:final fallbackLevel):
          expect(fallbackLevel, equals(AiFallbackLevel.gpt4oMini));
        default:
          fail('Expected AiError');
      }
    });
  });
}
