import 'package:eidolon/core/error/app_error.dart';

abstract interface class EidolonRespondRepository {
  Future<Result<EidolonResponse>> sendMessage({
    required String eidolonId,
    required String message,
    String? questContext,
  });
}

class EidolonResponse {
  const EidolonResponse({
    required this.text,
    required this.newMemoryId,
    required this.modelUsed,
    required this.latencyMs,
  });

  final String text;
  final String newMemoryId;
  final String modelUsed;
  final int latencyMs;
}
