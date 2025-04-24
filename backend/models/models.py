from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

class SearchResult(Base):
    __tablename__ = "search_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    search_id = Column(String, ForeignKey("searches.id"))
    title = Column(String)
    link = Column(String)
    price = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    content = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    location = Column(String, nullable=True)
    dong_id = Column(String, nullable=True)
    nickname = Column(String, nullable=True)
    nickname_id = Column(String, nullable=True)
    category = Column(String, nullable=True)
    created_at_origin = Column(String, nullable=True)
    boosted_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # 관계 설정
    search = relationship("Search", back_populates="results") 