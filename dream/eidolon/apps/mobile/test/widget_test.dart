import 'package:eidolon/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('EidolonApp renders without crashing',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: EidolonApp()),
    );
    await tester.pump();
    expect(find.text('EIDOLON'), findsOneWidget);
  });
}
