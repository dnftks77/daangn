from sqlalchemy import create_engine, inspect, text
import os

# Database connection settings
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_NAME = os.environ.get('DB_NAME', 'daangn_db')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def main():
    # Create engine
    print(f"Connecting to {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    # Create search_process table
    print("Creating search_process table...")
    with engine.connect() as conn:
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS search_process (
            id SERIAL PRIMARY KEY,
            search_request_id UUID REFERENCES search_requests(id),
            place_id INTEGER REFERENCES place_list(id),
            param VARCHAR(255) NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            items_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """))
        conn.commit()
    print("Table created or already exists.")
    
    # Insert example data into place_list
    print("Creating example place_list entries...")
    with engine.connect() as conn:
        conn.execute(text("""
        INSERT INTO place_list (id, sido, sigungu, dong, param, dong_id, place_title_original, from_area)
        VALUES (293, '인천', '연수구', '송도1동', '송도1동-887', 887, '송도1동', '인천')
        ON CONFLICT (id) DO UPDATE SET from_area = '인천'
        """))
        
        conn.execute(text("""
        INSERT INTO place_list (id, sido, sigungu, dong, param, dong_id, place_title_original, from_area)
        VALUES (294, '서울', '강남구', '역삼동', '역삼동-677', 677, '역삼동', '서울')
        ON CONFLICT (id) DO UPDATE SET from_area = '서울'
        """))
        
        conn.execute(text("""
        INSERT INTO place_list (id, sido, sigungu, dong, param, dong_id, place_title_original, from_area)
        VALUES (295, '부산', '해운대구', '우동', '우동-2992', 2992, '우동', '부산')
        ON CONFLICT (id) DO UPDATE SET from_area = '부산'
        """))
        
        conn.commit()
    print("Example data created.")

if __name__ == "__main__":
    main() 