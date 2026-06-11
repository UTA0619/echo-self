import 'package:eidolon/core/router/app_router.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:eidolon/features/onboarding/presentation/pages/onboarding_shell.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ignore: always_use_package_imports
import '../../../helpers/test_app.dart';

class _FakeOnboardingNotifier extends OnboardingNotifier {
  _FakeOnboardingNotifier(this._state);
  final OnboardingState _state;
  int previousCalls = 0;

  @override
  OnboardingState build() => _state;

  @override
  void previousStep() => previousCalls++;
}

Widget _shellApp(OnboardingState state, {_FakeOnboardingNotifier? notifier}) {
  final router = GoRouter(
    initialLocation: '/onboarding/${state.currentStep}',
    routes: [
      GoRoute(
        path: '/onboarding/:step',
        builder: (_, s) => OnboardingShell(
          child: Center(child: Text('step ${s.pathParameters['step']}')),
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      onboardingNotifierProvider
          .overrideWith(() => notifier ?? _FakeOnboardingNotifier(state)),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: router,
    ),
  );
}

void main() {
  group('OnboardingShell', () {
    testWidgets('step 0 hides the back button and shows the step indicator',
        (tester) async {
      await tester.pumpWidget(_shellApp(const OnboardingState()));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.arrow_back_ios_new_rounded), findsNothing);
      expect(find.text('step 0'), findsOneWidget);
    });

    testWidgets('a later step shows back and calls previousStep on tap',
        (tester) async {
      final notifier =
          _FakeOnboardingNotifier(const OnboardingState(currentStep: 2));
      await tester.pumpWidget(
        _shellApp(const OnboardingState(currentStep: 2), notifier: notifier),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.arrow_back_ios_new_rounded), findsOneWidget);

      await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
      await tester.pumpAndSettle();

      expect(notifier.previousCalls, 1);
    });
  });

  group('onboardingRedirect', () {
    testWidgets('redirects to home when onboarding is complete',
        (tester) async {
      late BuildContext ctx;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (c) {
              ctx = c;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(
        onboardingRedirect(const OnboardingState(isComplete: true), ctx),
        Routes.home,
      );
      expect(
        onboardingRedirect(const OnboardingState(isComplete: false), ctx),
        isNull,
      );
    });
  });
}
