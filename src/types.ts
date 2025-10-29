// src/types.ts

// 화면 뷰 타입 정의
export type View = 'library' | 'playlistDetail' | 'nowPlaying' | 'artistDetail' | 'albumDetail';

// 라이브러리 탭 타입 정의
export type LibraryTab = 'Playlists' | 'Albums' | 'Artists' | 'Songs';

// 곡 정보 타입
export interface Song {
  songId: number;
  title: string;
  artistId: number;
  albumId: number;
  filePath: string;
  durationSeconds: number;
  genre: string;
  // UI 표시용 추가 필드 (선택적)
  artistName?: string;
  albumCoverUrl?: string; // 곡 목록 표시 시 작은 커버용
}

// 재생목록 타입
export interface Playlist {
  playlistId: number;
  title: string;
  ownerUserId?: number; // 인증 없으면 사용 안 함
  isPublic?: number;
  createdAt?: string;
  coverUrl?: string; // 라이브러리 표시용 커버 (임시 할당됨)
}

// 앨범 타입
export interface Album {
  albumId: number;
  title: string;
  artistId: number;
  releaseDate?: string;
  coverUrl?: string; // API로부터 받은 실제 커버 URL
  artistName?: string; // 아티스트 이름 (App.tsx에서 조합 필요)
}

// 아티스트 타입
export interface Artist {
  artistId: number;
  name: string;
  imageUrl?: string; // 라이브러리 표시용 이미지 (임시 할당됨)
}

// --- 상세 뷰 타입 ---
// 재생목록 상세 (곡 목록 포함)
export interface PlaylistDetail extends Playlist {
  songs: Song[];
}

// 앨범 상세 (곡 목록 포함)
export interface AlbumDetail extends Album {
    songs: Song[];
}
