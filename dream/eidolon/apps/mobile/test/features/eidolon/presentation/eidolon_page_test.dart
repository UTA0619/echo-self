import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';
import 'package:eidolon/features/eidolon/presentation/pages/eidolon_page.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_chat_bubble.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_input_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_types/shared_types.dart';

// ignore: always_use_package_imports
import '../../../helpers/test_app.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap({required EidolonState state}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => const EidolonPage())],
  );
  return ProviderScope(
    overrides: [
      eidolonNotifierProvider.overrideWith(
        () => _FakeEidolonNotifier(state),
      ),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: router,
    ),
  );
}

Future<void> _settle(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 1));
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump();
}

EidolonProfile _profile({String name = 'Lyra', int level = 3}) {
  final now = DateTime(2026);
  return EidolonProfile(
    id: 'e1',
    userId: 'uid-1',
    name: name,
    level: level,
    xp: 100,
    xpToNext: 500,
    currentMood: EidolonMood.calm,
    personality: const PersonalityProfile(),
    createdAt: now,
    updatedAt: now,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('EidolonPage — loading', () {
    testWidgets('shows loading indicator while loading', (tester) async {
      await tester.pumpWidget(
        _wrap(
          state: const EidolonState(isLoading: true),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await _settle(tester);
    });
  });

  group('EidolonPage — empty state', () {
    testWidgets('shows empty state message when eidolon loaded, no messages',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          state: EidolonState(eidolon: _profile()),
        ),
      );
      await tester.pump();

      expect(find.text('Lyra is ready.'), findsOneWidget);
      expect(find.text('Say something to begin.'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows generic await message when eidolon name is empty',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          state: EidolonState(eidolon: _profile(name: '')),
        ),
      );
      await tester.pump();

      expect(find.text('Your Eidolon awaits…'), findsOneWidget);

      await _settle(tester);
    });
  });

  group('EidolonPage — with messages', () {
    testWidgets('renders chat messages in ListView', (tester) async {
      final msg = ChatMessage(
        id: 'm1',
        text: 'Hello adventurer!',
        isFromEidolon: true,
        timestamp: DateTime(2026),
      );
      await tester.pumpWidget(
        _wrap(
          state: EidolonState(
            eidolon: _profile(),
            messages: [msg],
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Hello adventurer!'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows typing indicator when isSending', (tester) async {
      final msg = ChatMessage(
        id: 'm1',
        text: 'Hi!',
        isFromEidolon: false,
        timestamp: DateTime(2026),
      );
      await tester.pumpWidget(
        _wrap(
          state: EidolonState(
            eidolon: _profile(),
            messages: [msg],
            isSending: true,
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(EidolonTypingIndicator), findsOneWidget);

      await _settle(tester);
    });
  });

  group('EidolonPage — error state', () {
    testWidgets('shows retry button when eidolon null and error set',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          state: const EidolonState(
            errorMessage: 'Connection failed',
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Retry'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('tapping Retry calls loadEidolon', (tester) async {
      final notifier = _FakeEidolonNotifier(
        const EidolonState(errorMessage: 'Connection failed'),
      );
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, __) => const EidolonPage())],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            eidolonNotifierProvider.overrideWith(() => notifier),
          ],
          child: MaterialApp.router(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            supportedLocales: const [Locale('en')],
            routerConfig: router,
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Retry'));
      await tester.pump();

      expect(notifier.loadCalled, true);

      await _settle(tester);
    });
  });

  group('EidolonPage — input bar', () {
    testWidgets('input bar visible when eidolon is loaded', (tester) async {
      await tester.pumpWidget(
        _wrap(
          state: EidolonState(eidolon: _profile()),
        ),
      );
      await tester.pump();

      expect(find.byType(EidolonInputBar), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('input bar hidden when no eidolon', (tester) async {
      await tester.pumpWidget(
        _wrap(
          state: const EidolonState(),
        ),
      );
      await tester.pump();

      expect(find.byType(EidolonInputBar), findsNothing);

      await _settle(tester);
    });
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeEidolonNotifier extends EidolonNotifier {
  _FakeEidolonNotifier(this._initial);
  final EidolonState _initial;
  bool loadCalled = false;

  @override
  EidolonState build() => _initial;

  @override
  Future<void> loadEidolon() async {
    loadCalled = true;
  }

  @override
  Future<void> sendMessage(String text) async {}

  @override
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}
