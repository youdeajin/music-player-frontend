-- ===================================
-- 1. 시퀀스 생성
-- ===================================
CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1 NOMAXVALUE;
CREATE SEQUENCE artists_seq START WITH 1 INCREMENT BY 1 NOMAXVALUE;
CREATE SEQUENCE albums_seq START WITH 1 INCREMENT BY 1 NOMAXVALUE;
CREATE SEQUENCE songs_seq START WITH 1 INCREMENT BY 1 NOMAXVALUE;
CREATE SEQUENCE playlists_seq START WITH 1 INCREMENT BY 1 NOMAXVALUE;
CREATE SEQUENCE playlist_songs_seq START WITH 1 INCREMENT BY 1 NOMAXVALUE;
-- (고급 기능을 위해 sleep_timers_seq 등도 필요하지만 1단계는 이 정도만)


-- ===================================
-- 2. 핵심 테이블 생성 (참조 순서 고려)
-- ===================================

-- 1) 사용자 테이블
CREATE TABLE users (
    user_id NUMBER PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password VARCHAR2(255) NOT NULL,
    nickname VARCHAR2(50),
    joined_at TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- 2) 아티스트 테이블
CREATE TABLE artists (
    artist_id NUMBER PRIMARY KEY,
    name VARCHAR2(100) NOT NULL
);

-- 3) 앨범 테이블 (artists 참조)
CREATE TABLE albums (
    album_id NUMBER PRIMARY KEY,
    title VARCHAR2(255) NOT NULL,
    artist_id NUMBER,
    release_date DATE,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
);

-- 4) 곡 테이블 (artists, albums 참조 - 1단계 핵심)
CREATE TABLE songs (
    song_id NUMBER PRIMARY KEY,
    title VARCHAR2(255) NOT NULL,
    artist_id NUMBER,
    album_id NUMBER,
    file_path VARCHAR2(512) NOT NULL, -- 필수 추가 컬럼
    duration_seconds NUMBER,
    genre VARCHAR2(50),
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id),
    FOREIGN KEY (album_id) REFERENCES albums(album_id)
);

-- 5) 재생목록 테이블 (users 참조)
CREATE TABLE playlists (
    playlist_id NUMBER PRIMARY KEY,
    title VARCHAR2(255) NOT NULL,
    owner_user_id NUMBER,
    is_public NUMBER(1,0) CHECK (is_public IN (0, 1)),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
);

-- 6) 재생목록_곡 테이블 (playlists, songs 참조)
CREATE TABLE playlist_songs (
    playlist_song_id NUMBER PRIMARY KEY,
    playlist_id NUMBER,
    song_id NUMBER,
    song_order NUMBER,
    FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id),
    FOREIGN KEY (song_id) REFERENCES songs(song_id)
);

-- artists_seq, albums_seq, songs_seq 시퀀스가 존재한다고 가정

-- 아티스트 추가
INSERT INTO artists (artist_id, name) VALUES (artists_seq.NEXTVAL, '아이유');
INSERT INTO artists (artist_id, name) VALUES (artists_seq.NEXTVAL, 'BTS');

-- 앨범 추가
INSERT INTO albums (album_id, title, artist_id, release_date) 
VALUES (albums_seq.NEXTVAL, 'LILAC', (SELECT artist_id FROM artists WHERE name = '아이유'), DATE '2021-03-25');

-- 곡 추가 (filePath는 프론트에서 접근 가능한 가상의 URL 또는 경로)
INSERT INTO songs (song_id, title, artist_id, album_id, file_path, duration_seconds, genre) 
VALUES (songs_seq.NEXTVAL, '라일락', 
    (SELECT artist_id FROM artists WHERE name = '아이유'), 
    (SELECT album_id FROM albums WHERE title = 'LILAC'), 
    'http://yourdomain.com/music/lilac.mp3', 210, 'K-Pop');

COMMIT;
