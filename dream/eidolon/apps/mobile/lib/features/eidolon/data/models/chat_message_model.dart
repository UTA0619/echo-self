import 'package:eidolon/features/eidolon/domain/entities/chat_message.dart';

/// Maps a flat Supabase `chat_messages` row to [ChatMessage].
class ChatMessageModel {
  static ChatMessage fromRow(Map<String, dynamic> row) {
    return ChatMessage(
      id: row['id'] as String,
      text: (row['content'] as String?) ?? '',
      isFromEidolon: (row['role'] as String?) == 'eidolon',
      timestamp: DateTime.parse(row['created_at'] as String),
      modelUsed: row['model_used'] as String?,
    );
  }
}
