# Todos los modelos están consolidados en user.py
from app.models.user import (  # noqa: F401
    TranslationSession, VoiceInput, SignInput, LexicalUnit,
    TranslationDetail, SignAvatarConfig, DeviceConfiguration,
    Feedback, Support, FavoriteWords, AccessLog, SystemErrorLog,
    FeedbackReply, Notification,
)