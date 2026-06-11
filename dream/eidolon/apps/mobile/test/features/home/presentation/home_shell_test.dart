import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/home/presentation/pages/home_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ignore: always_use_package_imports
import '../../../helpers/test_app.dart';

// Builds a real StatefulNavigationShell (5 branches) wrapped by HomeShell so
// the bottom navigation bar and branch switching execute.
GoRouter _router() {
  Widget branch(String label) => Scaffold(body: Center(child: Text(label)));
  return GoRouter(
    initialLocation: '/home',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => HomeShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (_, __) => branch('HOME')),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/eidolon', builder: (_, __) => branch('EIDOLON')),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/dungeon', builder: (_, __) => branch('DUNGEON')),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/gacha', builder: (_, __) => branch('GACHA')),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (_, __) => branch('SETTINGS'),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

Widget _app() => MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: _router(),
    );

void main() {
  testWidgets('renders five destinations starting on Home', (tester) async {
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationDestination), findsNWidgets(5));
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('tapping a destination switches the active branch',
      (tester) async {
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    // The dungeon tab uses the castle icon.
    await tester.tap(find.byIcon(Icons.castle_outlined));
    await tester.pumpAndSettle();

    expect(find.text('DUNGEON'), findsOneWidget);
    expect(find.text('HOME'), findsNothing);

    await tester.tap(find.byIcon(Icons.diamond_outlined));
    await tester.pumpAndSettle();
    expect(find.text('GACHA'), findsOneWidget);
  });
}
