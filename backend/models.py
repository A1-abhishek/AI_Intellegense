from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str
    content: str
    tags: list[str] = []
    language: str = "en"
    file_type: str = "text"
    content_type: str = "document"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    language: Optional[str] = None


class SearchQuery(BaseModel):
    query: str
    size: int = 20
    tags: Optional[list[str]] = None


class VectorSearchRequest(BaseModel):
    query: str
    n_results: int = 10
    search_type: str = "all"
    doc_ids: list[str] = []


class SummarizeRequest(BaseModel):
    doc_id: Optional[str] = None
    content: Optional[str] = None
    style: str = "concise"


class QuestionRequest(BaseModel):
    question: str
    doc_ids: list[str] = []
    use_all_docs: bool = False
    use_vector: bool = True


class TranslateRequest(BaseModel):
    doc_id: Optional[str] = None
    content: Optional[str] = None
    target_language: str = "es"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    doc_ids: list[str] = []
    use_all_docs: bool = False
    use_vector: bool = True


class EmbedRequest(BaseModel):
    doc_id: str


class BatchEmbedRequest(BaseModel):
    doc_ids: list[str] = []
    reembed: bool = False


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreateRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str = "viewer"


class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class FaceSearchRequest(BaseModel):
    image_id: Optional[str] = None
    face_index: int = 0
    threshold: float = 0.6
    n_results: int = 20


class FaceGalleryItem(BaseModel):
    doc_id: str
    filename: str
    face_count: int
    faces: list[dict]
