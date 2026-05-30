import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/onboarding/domain/entities/big_five_question.dart';
import 'package:eidolon/features/onboarding/domain/entities/onboarding_state.dart';
import 'package:eidolon/features/onboarding/presentation/pages/eidolon_naming_page.dart';
import 'package:eidolon/features/onboarding/presentation/pages/personality_page.dart';
import 'package:eidolon/features/onboarding/presentation/pages/username_page.dart';
import 'package:eidolon/features/onboarding/presentation/pages/welcome_page.dart';
import 'package:eidolon/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

// ignore: always_use_package_imports
import '../../../helpers/test_app.dart';

// Stub router that does nothing on context.go()
GoRouter _testRouter(Widget home) => GoRouter(
      initialLocation: '/',
      routes: [GoRoute(path: '/', builder: (_, __) => home)],
    );

Widget _wrap(Widget child, {List<Override> overrides = const []}) {
  return ProviderScope(
    overrides: overrides,
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: _testRouter(
        Scaffold(
          backgroundColor: const Color(0xFF09090F),
          body: SafeArea(child: child),
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('WelcomePage', () {
    testWidgets('renders EIDOLON title and Awaken button', (tester) async {
      await tester.pumpWidget(_wrap(const WelcomePage()));
      await tester.pump(const Duration(milliseconds: 1500));

      expect(find.text('EIDOLON'), findsOneWidget);
      expect(find.text('Awaken'), findsOneWidget);
      expect(find.text('Skip'), findsOneWidget);
    });

    testWidgets('Awaken button is tappable', (tester) async {
      await tester.pumpWidget(_wrap(const WelcomePage()));
      await tester.pump(const Duration(milliseconds: 1500));

      final awakenButton = find.widgetWithText(ElevatedButton, 'Awaken');
      expect(awakenButton, findsOneWidget);
      await tester.tap(awakenButton);
      await tester.pump();
    });
  });

  group('UsernamePage', () {
    testWidgets('renders text field and Continue button disabled initially', (tester) async {
      await tester.pumpWidget(_wrap(const UsernamePage()));
      await tester.pump(const Duration(milliseconds: 600));

      expect(find.byType(TextField), findsOneWidget);
      final continueButton = find.widgetWithText(ElevatedButton, 'Continue');
      expect(continueButton, findsOneWidget);
      final btn = tester.widget<ElevatedButton>(continueButton);
      expect(btn.onPressed, isNull);
    });

    testWidgets('shows validation error for short username', (tester) async {
      await tester.pumpWidget(_wrap(const UsernamePage()));
      await tester.pump(const Duration(milliseconds: 600));

      await tester.enterText(find.byType(TextField), 'ab');
      await tester.pump();

      expect(find.text('At least 3 characters'), findsOneWidget);
    });

    testWidgets('enables Continue button for valid username', (tester) async {
      await tester.pumpWidget(_wrap(const UsernamePage()));
      await tester.pump(const Duration(milliseconds: 600));

      await tester.enterText(find.byType(TextField), 'shadow_walker');
      await tester.pump();

      final continueButton = find.widgetWithText(ElevatedButton, 'Continue');
      final btn = tester.widget<ElevatedButton>(continueButton);
      expect(btn.onPressed, isNotNull);
    });

    testWidgets('rejects invalid characters and shows error', (tester) async {
      await tester.pumpWidget(_wrap(const UsernamePage()));
      await tester.pump(const Duration(milliseconds: 600));

      await tester.enterText(find.byType(TextField), 'Hello World!');
      await tester.pump();

      expect(find.text('Lowercase letters, numbers, and _ only'), findsOneWidget);
    });
  });

  group('PersonalityPage', () {
    testWidgets('renders first question and progress indicator', (tester) async {
      await tester.pumpWidget(_wrap(const PersonalityPage()));
      await tester.pump(const Duration(milliseconds: 600));

      expect(find.text('Who are you?'), findsOneWidget);
      expect(find.text('0 / ${kPersonalityQuestions.length}'), findsOneWidget);
    });

    testWidgets('Continue button disabled until all answered', (tester) async {
      await tester.pumpWidget(_wrap(const PersonalityPage()));
      await tester.pump(const Duration(milliseconds: 600));

      final continueButton = find.widgetWithText(ElevatedButton, 'Continue');
      final btn = tester.widget<ElevatedButton>(continueButton);
      expect(btn.onPressed, isNull);
    });

    testWidgets('answering a question updates the progress counter', (tester) async {
      await tester.pumpWidget(_wrap(const PersonalityPage()));
      await tester.pump(const Duration(milliseconds: 600));

      // Tap the middle dot (neutral, index 2 = value 3)
      final dots = find.byType(GestureDetector);
      await tester.tap(dots.at(2));
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.text('1 / ${kPersonalityQuestions.length}'), findsOneWidget);
    });
  });

  group('EidolonNamingPage', () {
    testWidgets('renders name input and disabled Awaken button initially', (tester) async {
      await tester.pumpWidget(_wrap(const EidolonNamingPage()));
      await tester.pump(const Duration(milliseconds: 700));

      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Name your\nsoul-twin.'), findsOneWidget);

      final button = find.widgetWithText(ElevatedButton, 'Awaken ');
      if (button.evaluate().isEmpty) {
        // Button text is "Awaken" when name is empty
        final btn = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
        expect(btn.onPressed, isNull);
      }
    });

    testWidgets('preview text appears after entering a name', (tester) async {
      await tester.pumpWidget(_wrap(const EidolonNamingPage()));
      await tester.pump(const Duration(milliseconds: 700));

      await tester.enterText(find.byType(TextField), 'Aether');
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.textContaining('Aether is awakening'), findsOneWidget);
    });

    testWidgets('Awaken button enabled after entering valid name', (tester) async {
      final state = OnboardingState(
        username: 'shadow_walker',
        eidolonName: 'Aether',
        answers: {for (var i = 1; i <= 10; i++) i: 3},
      );
      await tester.pumpWidget(_wrap(
        const EidolonNamingPage(),
        overrides: [
          onboardingNotifierProvider.overrideWith(
            () => _FakeOnboardingNotifier(state),
          ),
        ],
      ),);
      await tester.pump(const Duration(milliseconds: 700));

      final btn = tester.widget<ElevatedButton>(find.byType(ElevatedButton).last);
      expect(btn.onPressed, isNotNull);
    });
  });
}

class _FakeOnboardingNotifier extends OnboardingNotifier {
  _FakeOnboardingNotifier(this._initial);
  final OnboardingState _initial;

  @override
  OnboardingState build() => _initial;
}
