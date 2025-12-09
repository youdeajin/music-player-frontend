// src/types.ts

// --- 기본 데이터 타입 ---

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

// 🚨 [추가] 사용자 정보 타입
export interface User {
  userId: number; // 🚨 [추가] 필수!
  email: string;
  nickname: string;
  joinedAt?: string; // 관리자 페이지에서 사용
}

// --- 앱 내부 UI 상태 타입 ---

// Library 뷰의 탭 종류
export type LibraryTab = 'Songs' | 'Albums' | 'Playlists';

// 메인 화면 뷰 종류
export type View = 'library' | 'playlistDetail' | 'nowPlaying' | 'recentPlaylist' | 'admin';