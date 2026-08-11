from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Message(Base):
    __tablename__ = "Message"

    id_message  = Column(String(36), primary_key=True)
    id_sender   = Column(String(36), ForeignKey("User.id_user"), nullable=False)
    id_receiver = Column(String(36), ForeignKey("User.id_user"), nullable=False)
    content     = Column(Text, nullable=False)
    created_at  = Column(DateTime, server_default=func.now(), nullable=False)
    read_at     = Column(DateTime, nullable=True)

    sender   = relationship("User", foreign_keys=[id_sender],   back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[id_receiver], back_populates="received_messages")
