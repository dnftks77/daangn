from sqlalchemy import create_engine, inspect, text
import os
import argparse

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Create database tables')
    parser.add_argument('--cloud', action='store_true', help='Use Cloud SQL instead of local database')
    args = parser.parse_args()

    # Database connection settings
    if args.cloud:
        # GCP Cloud SQL settings
        DB_HOST = '34.85.3.52'  # Cloud SQL IP
        DB_PORT = '5432'
        DB_USER = 'daangn-user'
        DB_PASSWORD = 'daangn-user-pw-2024'
        DB_NAME = 'daangn'
    else:
        # Local database settings
        DB_HOST = os.environ.get('DB_HOST', 'localhost')
        DB_PORT = os.environ.get('DB_PORT', '5432')
        DB_USER = os.environ.get('DB_USER', 'postgres')
        DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
        DB_NAME = os.environ.get('DB_NAME', 'daangn_db')

    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    # Create engine
    print(f"Connecting to {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    # Create search_process table
    print("Creating search_process table...")
    with engine.connect() as conn:
        # Create search_requests table first if it doesn't exist
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS search_requests (
            id UUID PRIMARY KEY,
            query VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """))

        # Create place_list table if it doesn't exist
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS place_list (
            id SERIAL PRIMARY KEY,
            sido VARCHAR(50),
            sigungu VARCHAR(50),
            dong VARCHAR(50),
            param VARCHAR(255) UNIQUE,
            dong_id INTEGER,
            place_title_original VARCHAR(255),
            from_area VARCHAR(50)
        )
        """))
        
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            error_message TEXT
        )
        """))
        
        # Create search_results table if it doesn't exist
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS search_results (
            id SERIAL PRIMARY KEY,
            search_process_id INTEGER REFERENCES search_process(id),
            title VARCHAR(255) NOT NULL,
            price INTEGER,
            link TEXT,
            image_url TEXT,
            description TEXT,
            location VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            dong_id INTEGER
        )
        """))
        
        conn.commit()
    print("Tables created or already exist.")
    
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