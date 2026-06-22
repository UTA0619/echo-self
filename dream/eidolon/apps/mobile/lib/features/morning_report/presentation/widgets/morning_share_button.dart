import 'dart:typed_data';

import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/share_morning.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/shareable_morning_card.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

/// Abstraction over the OS share sheet so the share flow stays testable without
/// touching platform channels.
abstract interface class MorningSharer {
  Future<void> share(Uint8List pngBytes, String text);
}

/// Default sharer — hands the captured PNG to the OS share sheet (share_plus 12).
class SharePlusMorningSharer implements MorningSharer {
  const SharePlusMorningSharer();

  @override
  Future<void> share(Uint8List pngBytes, String text) async {
    await SharePlus.instance.share(
      ShareParams(
        files: [
          XFile.fromData(
            pngBytes,
            mimeType: 'image/png',
            name: 'eidolon_morning.png',
          ),
        ],
        text: text,
      ),
    );
  }
}

/// Capture the [RepaintBoundary] at [boundaryKey] as a PNG and hand it to
/// [sharer]. Returns false if the boundary was not ready. Extracted from the
/// widget so the capture→share pipeline is testable without driving a gesture.
Future<bool> captureAndShare({
  required GlobalKey boundaryKey,
  required MorningSharer sharer,
  required String text,
}) async {
  final png = await captureCardPng(boundaryKey);
  if (png == null) return false;
  await sharer.share(png, text);
  return true;
}

/// A share preview + call-to-action — the growth loop. Shows the
/// [ShareableMorningCard] (so the player sees exactly what they'll post), then a
/// button that captures that visible card to a PNG and hands it to [sharer].
/// Capturing an on-screen [RepaintBoundary] is reliable across platforms and tests.
class MorningShareCard extends StatefulWidget {
  const MorningShareCard({
    super.key,
    required this.report,
    required this.eidolonName,
    required this.label,
    this.shareText = 'My Eidolon adventured while I slept. 🌙 #Eidolon',
    this.sharer = const SharePlusMorningSharer(),
    this.onShareInitiated,
    this.onShareCompleted,
  });

  final MorningReport report;
  final String eidolonName;
  final String label;
  final String shareText;
  final MorningSharer sharer;

  /// Fired when the player taps share (intent) — top of the viral funnel.
  final VoidCallback? onShareInitiated;

  /// Fired after the share pipeline runs; [success] is false if the card could
  /// not be captured — bottom of the viral funnel.
  final ValueChanged<bool>? onShareCompleted;

  @override
  State<MorningShareCard> createState() => _MorningShareCardState();
}

class _MorningShareCardState extends State<MorningShareCard> {
  final _cardKey = GlobalKey();
  bool _busy = false;

  Future<void> _share() async {
    if (_busy) return;
    widget.onShareInitiated?.call();
    setState(() => _busy = true);
    var ok = false;
    try {
      ok = await captureAndShare(
        boundaryKey: _cardKey,
        sharer: widget.sharer,
        text: widget.shareText,
      );
    } finally {
      widget.onShareCompleted?.call(ok);
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        RepaintBoundary(
          key: _cardKey,
          child: ShareableMorningCard(
            report: widget.report,
            eidolonName: widget.eidolonName,
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _busy ? null : _share,
          icon: const Icon(Icons.ios_share, size: 18),
          label: Text(widget.label),
        ),
      ],
    );
  }
}
