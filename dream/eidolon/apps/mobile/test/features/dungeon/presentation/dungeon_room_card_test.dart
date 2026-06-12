import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/dungeon/presentation/widgets/dungeon_room_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../../helpers/test_app.dart';

Widget _wrap(DungeonRoom room, {int roomNumber = 1, int totalRooms = 5}) =>
    MaterialApp(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      home: Scaffold(
        body: DungeonRoomCard(
          room: room,
          roomNumber: roomNumber,
          totalRooms: totalRooms,
        ),
      ),
    );

DungeonRoom _room({
  String eventType = 'combat',
  String description = 'A dim corridor.',
  Map<String, dynamic> eventData = const {},
}) =>
    DungeonRoom(
      index: 0,
      description: description,
      eventType: eventType,
      eventData: eventData,
    );

void main() {
  testWidgets('renders icon, room counter, type badge and description',
      (tester) async {
    await tester.pumpWidget(
      _wrap(
        _room(description: 'A mossy clearing.'),
        roomNumber: 2,
        totalRooms: 7,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('⚔️'), findsOneWidget); // combat icon
    expect(find.text('Room 2 / 7'), findsOneWidget);
    expect(find.text('COMBAT'), findsOneWidget); // uppercased type badge
    expect(find.text('A mossy clearing.'), findsOneWidget);
  });

  testWidgets('unknown event type falls back to the ❓ icon', (tester) async {
    await tester.pumpWidget(_wrap(_room(eventType: 'mystery')));
    await tester.pumpAndSettle();

    expect(find.text('❓'), findsOneWidget);
    expect(find.text('MYSTERY'), findsOneWidget);
  });

  testWidgets('boss room shows the boss name panel', (tester) async {
    await tester.pumpWidget(
      _wrap(_room(eventType: 'boss', eventData: {'name': 'The Hollow King'})),
    );
    await tester.pumpAndSettle();

    expect(find.text('💀'), findsOneWidget);
    expect(find.text('The Hollow King'), findsOneWidget);
  });

  testWidgets('boss room without a name does not render the boss panel',
      (tester) async {
    await tester.pumpWidget(_wrap(_room(eventType: 'boss')));
    await tester.pumpAndSettle();

    // Only the badge says BOSS; no extra name container.
    expect(find.text('BOSS'), findsOneWidget);
    expect(find.text('Final Boss'), findsNothing);
  });
}
