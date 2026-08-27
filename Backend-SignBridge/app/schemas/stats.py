from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MostUsedPhrase(BaseModel):
    id_lexicalunit: str
    phrase:          str
    language:       str
    times_used:     int = 0
    unique_users:   int = 0
    video_url:      Optional[str] = None


class UserInteractionStats(BaseModel):
    id_user:                   str
    full_name:                 str
    email:                     str
    total_sessions:            int = 0
    voice_to_sign_sessions:    int = 0
    sign_to_text_sessions:     int = 0
    favorites_count:           int = 0
    words_translated:          int = 0
    feedbacks_given:           int = 0
    last_session_date:         Optional[datetime] = None
