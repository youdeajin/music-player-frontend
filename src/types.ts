// --- 기본 데이터 타입 ---
// (Song, Artist, Album, Playlist, PlaylistDetail 인터페이스 정의는 기존과 동일)

export interface Artist {
  artistId: number;
  name: string;
  imageUrl?: string;
}

export interface Album {
  albumId: number;
  title: string;
  artistId: number;
  releaseDate: string;
  coverUrl?: string;
  artistName?: string;
}

export interface Song {
  songId: number;
  title: string;
  artistId: number;
  albumId: number;
  filePath: string;
  durationSeconds: number;
  genre: string;
  albumCoverUrl?: string;
  artistName?: string;
}

export interface Playlist {
  playlistId: number;
  title: string;
  ownerUserId: number;
  isPublic: number;
  createdAt: string;
  coverUrl?: string;
  songs?: Song[];
}

export interface PlaylistDetail extends Playlist {
  songs: Song[];
}


// --- 앱 내부 UI 상태 타입 ---

// 🚨 [수정] Library 뷰의 탭 종류 (순서 되돌리기: Songs, Albums, Playlists)
export type LibraryTab = 'Songs' | 'Albums' | 'Playlists';

// 메인 화면 뷰 종류
export type View = 'library' | 'playlistDetail' | 'nowPlaying';

