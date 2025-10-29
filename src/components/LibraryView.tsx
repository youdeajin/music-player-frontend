import React, { useState } from 'react';
// AlbumGrid 컴포넌트를 import 합니다. (Albums 탭에서 사용)
import AlbumGrid from './AlbumGrid';
// types.ts 파일에서 공유하는 타입들을 import 합니다.
import { Playlist, Album, Artist, Song, LibraryTab } from '../types';
import axios from 'axios'; // 👈 이 줄을 추가하세요!

// LibraryView 컴포넌트가 App.tsx로부터 받을 Props 타입을 정의합니다.
interface LibraryViewProps {
  playlists: Playlist[]; // 모든 플레이리스트 목록
  albums: Album[];     // 모든 앨범 목록
  artists: Artist[];   // 모든 아티스트 목록
  songs: Song[];       // 모든 곡 목록 ('Songs' 탭용)
  featuredSongs: Song[]; // 앨범/플레이리스트 없을 때 보여줄 추천 곡 목록
  onPlaylistClick: (id: number) => void; // 플레이리스트 클릭 시 App.tsx 함수 호출
  onAlbumClick: (id: number) => void;    // 앨범 클릭 시 App.tsx 함수 호출
  onArtistClick: (id: number) => void;   // 아티스트 클릭 시 App.tsx 함수 호출
  // 곡 클릭 시 App.tsx 함수 호출 (어떤 목록에서 왔는지 구분자 포함)
  onSongClick: (index: number, sourceList: 'all' | 'featured') => void;
  refreshPlaylists: () => Promise<void>;
}

// --- LibraryView 컴포넌트 정의 ---
const LibraryView: React.FC<LibraryViewProps> = ({
  playlists, albums, artists, songs, featuredSongs,
  onPlaylistClick, onAlbumClick, onArtistClick, onSongClick,
  refreshPlaylists // 🚨 새로고침 함수 받기
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('Playlists');
  // 🚨 새 재생목록 이름 입력 상태 추가
  const [newPlaylistName, setNewPlaylistName] = useState('');
  // 🚨 생성 로딩 상태 추가 (선택적)
  const [isCreating, setIsCreating] = useState(false);

  // 아티스트 ID를 이름으로 변환하는 헬퍼 함수
  // artists 배열에서 ID가 일치하는 아티스트를 찾아 이름을 반환합니다.
  const getArtistName = (artistId: number): string => {
    const artist = artists.find(a => a.artistId === artistId);
    // 아티스트를 찾으면 이름을, 못 찾으면 ID를 문자열로 반환
    return artist ? artist.name : `아티스트 ID ${artistId}`;
  };

  // 추천 곡 목록을 렌더링하는 함수 (앨범/플레이리스트 없을 때 사용)
  const renderFeaturedSongs = () => (
      // 추천 곡 섹션 컨테이너
      <div className="featured-songs-section">
          <h3 className="featured-title">추천 곡</h3>
          {/* 'Songs' 탭과 유사한 리스트 뷰 사용 */}
          <ul className="song-list-view featured-song-list">
              {/* featuredSongs 배열 순회 */}
              {featuredSongs.map((song, index) => (
                  <li
                      // 고유 키 설정
                      key={`featured-${song.songId}-${index}`}
                      className="song-item" // CSS 클래스
                      // 클릭 시 App.tsx의 onSongClick 호출 (출처: 'featured')
                      onClick={() => onSongClick(index, 'featured')}
                  >
                      {/* 작은 앨범 커버 */}
                      <img src={song.albumCoverUrl || '/logo192.png'} alt="앨범 커버" className="song-item-cover-small" />
                      {/* 곡 정보 (제목, 아티스트) */}
                      <div className="song-item-info">
                          <p className="song-item-title">{song.title}</p>
                          <p className="song-item-subtitle">{getArtistName(song.artistId)}</p>
                      </div>
                      {/* 곡 길이 */}
                      <span className="song-item-duration">{formatTime(song.durationSeconds)}</span>
                  </li>
              ))}
          </ul>
      </div>
  );
  // 🚨 새 재생목록 생성 함수
  const handleCreateNewPlaylist = async () => {
      if (!newPlaylistName.trim()) {
          alert('새 재생목록 이름을 입력해주세요.');
          return;
      }
      setIsCreating(true); // 로딩 시작
      try {
          // 백엔드 API 호출 (빈 곡 목록으로 생성)
          const response = await axios.post('https://localhost:8443/api/playlists', {
              title: newPlaylistName,
              isPublic: true, // 기본값 public
              songIds: [] // 빈 배열 전달
          });

          if (response.status === 201) {
              alert(`'${newPlaylistName}' 재생목록 생성 완료!`);
              setNewPlaylistName(''); // 입력창 비우기
              await refreshPlaylists(); // App 컴포넌트의 새로고침 함수 호출
          }
      } catch (error) {
          console.error("새 재생목록 생성 실패:", error);
          alert('재생목록 생성 중 오류가 발생했습니다.');
      } finally {
          setIsCreating(false); // 로딩 종료
      }
  };

  // 활성화된 탭에 따라 다른 컨텐츠를 렌더링하는 함수
  const renderContent = () => {
    switch (activeTab) {
      // --- Playlists 탭 ---
      case 'Playlists':
        // 플레이리스트가 없고 추천 곡이 있으면 추천 곡 표시
        if (playlists.length === 0 && featuredSongs.length > 0) {
            return renderFeaturedSongs();
        }
        // 플레이리스트가 있으면 격자 형태로 표시
        return (
          <>
            {/* 🚨 새 재생목록 생성 UI */}
            <div className="create-playlist-inline-form">
              <input
                type="text"
                placeholder="새 재생목록 이름..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                disabled={isCreating}
                className="inline-input"
              />
              <button onClick={handleCreateNewPlaylist} disabled={isCreating} className="inline-button">
                {isCreating ? '생성 중...' : '만들기'}
              </button>
            </div>

            {/* 기존 플레이리스트 그리드 */}
            <div className="library-grid">
              {playlists.length > 0 ? playlists.map((playlist) => (
                <div key={`playlist-${playlist.playlistId}`} className="grid-item" /* ... */> {/* 기존 렌더링 */} </div>
              )) : <p className="loading-text">표시할 플레이리스트가 없습니다.</p>}
            </div>
          </>
        );
      // --- Albums 탭 ---
      case 'Albums':
         // 앨범이 없고 추천 곡이 있으면 추천 곡 표시
        if (albums.length === 0 && featuredSongs.length > 0) {
            return renderFeaturedSongs();
        }
        // 앨범이 있으면 AlbumGrid 컴포넌트 사용
        return (
          albums.length > 0
            ? <AlbumGrid
                albums={albums} // 앨범 목록 전달
                artists={artists} // 아티스트 목록 전달 (이름 표시용)
                onAlbumClick={onAlbumClick} // 클릭 핸들러 전달
              />
            : <p className="loading-text">표시할 앨범이 없습니다.</p> // 없으면 메시지 표시
        );

      // --- Artists 탭 ---
      case 'Artists':
        return (
          <div className="library-grid">
            {artists.length > 0 ? artists.map((artist) => (
              <div
                key={`artist-${artist.artistId}`}
                className="grid-item artist-item" // 아티스트용 스타일 클래스
                onClick={() => onArtistClick(artist.artistId)} // 클릭 시 상세 (미구현)
              >
                {/* 아티스트 이미지 (원형) */}
                <img src={artist.imageUrl || '/logo192.png'} alt={artist.name} className="grid-item-cover artist-cover" />
                {/* 아티스트 이름 */}
                <p className="grid-item-title">{artist.name}</p>
              </div>
            )) : <p className="loading-text">표시할 아티스트가 없습니다.</p>}
          </div>
        );

      // --- Songs 탭 ---
      case 'Songs':
        return (
          <ul className="song-list-view">
            {songs.length > 0 ? songs.map((song, index) => (
              // 클릭 시 App.tsx의 onSongClick 호출 (출처: 'all')
              <li key={`song-${song.songId}-${index}`} className="song-item" onClick={() => onSongClick(index, 'all')}>
                 {/* 작은 앨범 커버 */}
                 <img src={song.albumCoverUrl || '/logo192.png'} alt="앨범 커버" className="song-item-cover-small" />
                 {/* 곡 정보 */}
                 <div className="song-item-info">
                   <p className="song-item-title">{song.title}</p>
                   <p className="song-item-subtitle">{getArtistName(song.artistId)}</p>
                 </div>
                 {/* 곡 길이 */}
                 <span className="song-item-duration">{formatTime(song.durationSeconds)}</span>
              </li>
            )) : <p className="loading-text">표시할 곡이 없습니다.</p>}
          </ul>
        );
      default: return null; // 그 외의 경우 아무것도 렌더링하지 않음
    }
  };

  // 시간 포맷 함수 (초 -> MM:SS)
  const formatTime = (seconds: number): string => {
      if (isNaN(seconds) || seconds < 0) return "0:00";
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  // --- LibraryView 컴포넌트 JSX 렌더링 ---
  return (
    // 라이브러리 전체 컨테이너
    <div className="library-container">
      {/* 상단 헤더 */}
      <div className="library-header">
        <button className="menu-button">☰</button> {/* TODO: 메뉴 기능 */}
        <h1>Library</h1>
        <button className="search-button">🔍</button> {/* TODO: 검색 기능 */}
      </div>
      {/* 탭 버튼 영역 */}
      <div className="library-tabs">
        {/* 탭 이름 배열을 순회하며 버튼 생성 */}
        {(['Playlists', 'Albums', 'Artists', 'Songs'] as LibraryTab[]).map((tab) => (
          <button
            key={tab}
            // 현재 활성 탭이면 'active' 클래스 추가
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            // 클릭 시 activeTab 상태 변경
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* 정렬/필터 버튼 영역 (선택 사항) */}
      <div className="library-filter-sort">
        <button>Sort / Filter</button> {/* TODO: 정렬/필터 기능 */}
      </div>
      {/* 메인 컨텐츠 영역 (선택된 탭에 따라 내용 변경) */}
      <div className="library-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default LibraryView; // 컴포넌트 내보내기

