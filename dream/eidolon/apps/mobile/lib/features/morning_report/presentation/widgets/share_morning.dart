import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Capture a [RepaintBoundary] (e.g. wrapping a [ShareableMorningCard]) as PNG
/// bytes, ready to hand to a share sheet. Dependency-free (Flutter built-ins) so
/// the share pipeline adds no new package; wiring the actual OS share sheet
/// (e.g. share_plus) is a thin final hop on top of these bytes.
///
/// Returns null if the boundary is not ready. Wrap your card like:
///   RepaintBoundary(key: key, child: ShareableMorningCard(...))
Future<Uint8List?> captureCardPng(
  GlobalKey boundaryKey, {
  double pixelRatio = 3.0,
}) async {
  final object = boundaryKey.currentContext?.findRenderObject();
  if (object is! RenderRepaintBoundary) return null;
  final image = await object.toImage(pixelRatio: pixelRatio);
  try {
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return data?.buffer.asUint8List();
  } finally {
    image.dispose();
  }
}
