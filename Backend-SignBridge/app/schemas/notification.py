from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationOut(BaseModel):
    id_notification: str
    title:           str
    message:         str
    type:            str = "info"
    is_read:         bool = False
    link:            Optional[str] = None
    created_at:      datetime

    model_config = {"from_attributes": True}
