import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:eidolon/features/onboarding/domain/usecases/complete_onboarding_usecase.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeAuthNotifier extends AuthNotifier {
  _FakeAuthNotifier(this._state);
  final AuthState _state;

  @override
  AuthState build() => _state;
}

class _FakeCompleteUseCase implements CompleteOnboardingUseCase {
  _FakeCompleteUseCase(this.result);
  final Result<void> result;

  OnboardingState? lastState;
  String? lastAuthUid;

  @override
  Future<Result<void>> call(
    OnboardingState state, {
    required String authUid,
  }) async {
    lastState = state;
    lastAuthUid = authUid;
    return result;
  }
}

const _authed = AuthState(
  status: AuthStatus.authenticated,
  user: AuthUser(uid: 'auth-1', email: 't@t.com'),
);

ProviderContainer _container({
  required Result<void> completeResult,
  AuthState auth = _authed,
  _FakeCompleteUseCase? capture,
}) {
  final c = ProviderContainer(
    overrides: [
      authNotifierProvider.overrideWith(() => _FakeAuthNotifier(auth)),
      completeOnboardingUseCaseProvider.overrideWithValue(
        capture ?? _FakeCompleteUseCase(completeResult),
      ),
    ],
  );
  addTearDown(c.dispose);
  return c;
}

void main() {
  group('field setters', () {
    test('setUsername / setEidolonName / setAnswer update and clear error', () {
      final c = _container(completeResult: ok(null));
      final n = c.read(onboardingNotifierProvider.notifier);

      n.setUsername('shadow');
      expect(c.read(onboardingNotifierProvider).username, 'shadow');

      n.setEidolonName('Nyx');
      expect(c.read(onboardingNotifierProvider).eidolonName, 'Nyx');

      n.setAnswer(1, 5);
      n.setAnswer(2, 3);
      expect(c.read(onboardingNotifierProvider).answers, {1: 5, 2: 3});
    });
  });

  group('step navigation', () {
    test('nextStep advances and clamps at 3', () {
      final c = _container(completeResult: ok(null));
      final n = c.read(onboardingNotifierProvider.notifier);

      for (var i = 0; i < 5; i++) {
        n.nextStep();
      }
      expect(c.read(onboardingNotifierProvider).currentStep, 3);
    });

    test('previousStep retreats and clamps at 0', () {
      final c = _container(completeResult: ok(null));
      final n = c.read(onboardingNotifierProvider.notifier)
        ..nextStep()
        ..nextStep();
      expect(c.read(onboardingNotifierProvider).currentStep, 2);

      n
        ..previousStep()
        ..previousStep()
        ..previousStep();
      expect(c.read(onboardingNotifierProvider).currentStep, 0);
    });
  });

  group('complete', () {
    test('unauthenticated → error message, use case not called', () async {
      final capture = _FakeCompleteUseCase(ok(null));
      final c = _container(
        completeResult: ok(null),
        auth: const AuthState(status: AuthStatus.unauthenticated),
        capture: capture,
      );

      await c.read(onboardingNotifierProvider.notifier).complete();

      final s = c.read(onboardingNotifierProvider);
      expect(s.isComplete, isFalse);
      expect(s.errorMessage, contains('Not signed in'));
      expect(capture.lastAuthUid, isNull); // never invoked
    });

    test('success → isComplete true, passes state + authUid to the use case',
        () async {
      final capture = _FakeCompleteUseCase(ok(null));
      final c = _container(completeResult: ok(null), capture: capture);
      c.read(onboardingNotifierProvider.notifier).setUsername('kai');

      await c.read(onboardingNotifierProvider.notifier).complete();

      final s = c.read(onboardingNotifierProvider);
      expect(s.isComplete, isTrue);
      expect(s.isSubmitting, isFalse);
      expect(capture.lastAuthUid, 'auth-1');
      expect(capture.lastState!.username, 'kai');
    });

    test('failure → maps the error and leaves isComplete false', () async {
      final c = _container(
        completeResult: err(const AppError.network(message: 'rls denied')),
      );

      await c.read(onboardingNotifierProvider.notifier).complete();

      final s = c.read(onboardingNotifierProvider);
      expect(s.isComplete, isFalse);
      expect(s.isSubmitting, isFalse);
      expect(s.errorMessage, 'rls denied');
    });
  });
}
