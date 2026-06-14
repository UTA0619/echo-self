import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Resolves auth synchronously to the login screen — no Supabase, no async,
/// no pending timers — so the smoke test is deterministic.
class _StubAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(status: AuthStatus.unauthenticated);
}

void main() {
  testWidgets('EidolonApp renders without crashing',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authNotifierProvider.overrideWith(_StubAuthNotifier.new),
        ],
        child: const EidolonApp(),
      ),
    );
    await tester.pump();

    // Smoke test: the login screen's EIDOLON wordmark renders without crashing.
    expect(find.text('EIDOLON'), findsOneWidget);
  });
}
