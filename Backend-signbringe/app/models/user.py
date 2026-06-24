from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Role(Base):
    __tablename__ = "Role"

    id_role = Column(String(36), primary_key=True)
    role_name = Column(String(50), nullable=False, unique=True)

    users = relationship("User", back_populates="role")


class Region(Base):
    __tablename__ = "Region"

    id_region = Column(String(36), primary_key=True)
    region_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    users = relationship("User", back_populates="region")


class User(Base):
    __tablename__ = "User"

    id_user = Column(String(36), primary_key=True)
    id_role = Column(String(36), ForeignKey("Role.id_role"), nullable=False)
    id_region = Column(String(36), ForeignKey("Region.id_region"), nullable=True)
    first_name = Column(String(50), nullable=False)
    middle_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=False)
    second_last_name = Column(String(50), nullable=True)
    phone = Column(String(20), nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    role = relationship("Role", back_populates="users")
    region = relationship("Region", back_populates="users")
    sessions = relationship("TranslationSession", back_populates="user")
    avatar_config = relationship("SignAvatarConfig", back_populates="user", uselist=False)
    device_config = relationship("DeviceConfiguration", back_populates="user", uselist=False)
    feedbacks = relationship("Feedback", back_populates="user")
    support_tickets = relationship("Support", back_populates="user")
    favorite_words = relationship("FavoriteWords", back_populates="user")
    access_logs = relationship("AccessLog", back_populates="user")


class TranslationSession(Base):
    __tablename__ = "TranslationSession"

    id_session = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"), nullable=False)
    date_time = Column(DateTime, server_default=func.now())
    status = Column(String(20))
    translation_type = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    details = relationship("TranslationDetail", back_populates="session")
    voice_inputs = relationship("VoiceInput", back_populates="session")
    sign_inputs = relationship("SignInput", back_populates="session")
    feedbacks = relationship("Feedback", back_populates="session")


class VoiceInput(Base):
    __tablename__ = "VoiceInput"

    id_voice_input = Column(String(36), primary_key=True)
    id_session = Column(String(36), ForeignKey("TranslationSession.id_session"))
    audio_url = Column(String(255))
    generated_text = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    session = relationship("TranslationSession", back_populates="voice_inputs")


class SignInput(Base):
    __tablename__ = "SignInput"

    id_sign_input = Column(String(36), primary_key=True)
    id_session = Column(String(36), ForeignKey("TranslationSession.id_session"))
    video_url = Column(String(255))
    generated_text = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    session = relationship("TranslationSession", back_populates="sign_inputs")


class LexicalUnit(Base):
    __tablename__ = "LexicalUnit"

    id_lexicalunit = Column(String(36), primary_key=True)
    text = Column(String(100))
    language = Column(String(50), nullable=False, default="es_CO")
    video_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    details = relationship("TranslationDetail", back_populates="lexical_unit")
    favorite_words = relationship("FavoriteWords", back_populates="lexical_unit")


class TranslationDetail(Base):
    __tablename__ = "TranslationDetail"

    id_detail = Column(String(36), primary_key=True)
    id_session = Column(String(36), ForeignKey("TranslationSession.id_session"), nullable=False)
    id_lexicalunit = Column(String(36), ForeignKey("LexicalUnit.id_lexicalunit"), nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    session = relationship("TranslationSession", back_populates="details")
    lexical_unit = relationship("LexicalUnit", back_populates="details")


class SignAvatarConfig(Base):
    __tablename__ = "SignAvatarConfig"

    id_sign_avatar = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"), unique=True)
    avatar_style = Column(String(50))
    skin_color = Column(String(50))
    clothing_color = Column(String(50))
    avatar_size = Column(String(10))
    lsc_speed = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="avatar_config")


class DeviceConfiguration(Base):
    __tablename__ = "DeviceConfiguration"

    id_config = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"), unique=True)
    offline_usage = Column(Boolean)
    android_version = Column(String(20))
    screen_size = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="device_config")


class Feedback(Base):
    __tablename__ = "Feedback"

    id_feedback = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"))
    id_session = Column(String(36), ForeignKey("TranslationSession.id_session"))
    rating = Column(Integer)
    comment = Column(Text)
    date = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="feedbacks")
    session = relationship("TranslationSession", back_populates="feedbacks")


class Support(Base):
    __tablename__ = "Support"

    id_support = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"))
    subject = Column(String(150))
    message = Column(Text)
    status = Column(String(20), default="pending")
    date = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="support_tickets")


class FavoriteWords(Base):
    __tablename__ = "FavoriteWords"

    id_favorite = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"))
    id_lexicalunit = Column(String(36), ForeignKey("LexicalUnit.id_lexicalunit"))
    times_used = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="favorite_words")
    lexical_unit = relationship("LexicalUnit", back_populates="favorite_words")


class AccessLog(Base):
    __tablename__ = "AccessLog"

    id_log = Column(String(36), primary_key=True)
    id_user = Column(String(36), ForeignKey("User.id_user"))
    date_time = Column(DateTime, server_default=func.now())
    access_type = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="access_logs")


class SystemErrorLog(Base):
    __tablename__ = "SystemErrorLog"

    id_error = Column(String(36), primary_key=True)
    error_type = Column(String(100))
    module = Column(String(100))
    message = Column(Text)
    date = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)