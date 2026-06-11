import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

final log = Logger(
  printer: PrettyPrinter(
    methodCount: 2,
    errorMethodCount: 8,
    lineLength: 100,
    colors: true,
    printEmojis: true,
  ),
  filter: kReleaseMode ? ProductionFilter() : DevelopmentFilter(),
  output: kReleaseMode ? null : ConsoleOutput(),
);
