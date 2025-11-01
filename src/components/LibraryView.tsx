import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AlbumGrid from './AlbumGrid';
import { Playlist, Album, Artist, Song, LibraryTab } from '../types';

interface LibraryViewProps {
  playlists: Playlist[];
  albums: Album[];
  artists: Artist[]; // 🚨 아티스트 이름 매핑용 (필수)
  songs: Song[];
  featuredSongs: Song[];
  onPlaylistClick: (id: number) => void;
  onAlbumClick: (id: number) => void;
  onSongClick: (index: number, sourceList: Song[]) => void;
  refreshPlaylists: () => Promise<void>;
  onSearchResultClick: (song: Song) => void; // 🚨 수정된 Song 객체를 받음
}

const LibraryView: React.FC<LibraryViewProps> = ({
  playlists, albums, artists, songs, featuredSongs,
  onPlaylistClick, onAlbumClick, onSongClick,
  refreshPlaylists,
  onSearchResultClick
}) => {
  // 🚨 기본 탭 'Songs'로 유지
  const [activeTab, setActiveTab] = useState<LibraryTab>('Songs');
  
  // (기존 상태 변수들)
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- 검색 로직 (artistName 매핑 추가) ---
  useEffect(() => {
    if (!isSearchVisible || !searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const response = await axios.get(`https://localhost:8443/api/songs/search`, { params: { query: searchQuery } });
        
        // 🚨 [수정] 검색 결과(순수 Song)에도 artistName과 coverUrl을 매핑합니다.
        const processedSearchResults = (Array.isArray(response.data) ? response.data : []).map(song => {
            const artist = artists.find(a => a.artistId === song.artistId);
            const album = albums.find(al => al.albumId === song.albumId);
            return {
                ...song,
                artistName: artist?.name || `ID ${song.artistId}`,
                albumCoverUrl: album?.coverUrl || '/logo192.png'
            };
        });
        setSearchResults(processedSearchResults); // 🚨 가공된 데이터(artistName 포함)로 상태 업데이트
        
      } catch (error) { console.error("곡 검색 실패:", error); setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 300);
    // 🚨 artists, albums가 로드된 후 검색이 실행되도록 의존성 추가
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, isSearchVisible, artists, albums]); // 🚨 artists, albums 의존성 추가

  // 🚨 [수정] 누락되었던 검색 아이콘 클릭 핸들러
  const handleSearchIconClick = () => {
      setIsSearchVisible(!isSearchVisible); // 검색창 표시/숨김 토글
      if (isSearchVisible) { // 검색창이 닫힐 때
          setSearchQuery(''); // 검색어 초기화
          setSearchResults([]); // 결과 초기화
      }
  };
  // --- 검색 로직 끝 ---

  
  // --- 헬퍼 함수 (Helper Functions) ---
  
  // 아티스트 ID를 이름으로 변환
  const getArtistName = (artistId: number): string => {
    // artists prop은 이름 매핑을 위해 App.tsx에서 계속 전달받습니다.
    const artist = artists.find(a => a.artistId === artistId);
    return artist ? artist.name : `아티스트 ID ${artistId}`;
  };

  // 시간 포맷 (초 -> MM:SS)
  const formatTime = (seconds: number): string => {
      if (isNaN(seconds) || seconds < 0) return "0:00";
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // --- 새 재생목록 생성 (기존과 동일) ---
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

  // --- 'Albums' 탭용 앨범별 곡 그룹화 로직 (useMemo) ---
  const songsByAlbum = useMemo(() => {
    return songs.reduce((acc, song) => {
      const albumId = song.albumId || 'unknown';
      if (!acc[albumId]) acc[albumId] = [];
      acc[albumId].push(song);
      return acc;
    }, {} as Record<string | number, Song[]>);
  }, [songs]);

  // --- 'Songs' 탭용 셔플된 곡 목록 (useMemo) ---
  const shuffledAllSongs = useMemo(() => {
    // 얕은 복사본을 만들어 원본 배열을 변경하지 않고 셔플
    return [...songs].sort(() => Math.random() - 0.5);
  }, [songs]);


  // --- 탭 컨텐츠 렌더링 ---
  const renderContent = () => {
    switch (activeTab) {

      // --- 🚨 'Songs' 탭 (추천 곡 가로 스크롤 - '노래.png' UI) ---
      case 'Songs':
        // 추천 곡 섹션 (featuredSongs가 있을 때만)
        const featuredSection = featuredSongs.length > 0 ? (
          <section className="album-song-section">
            <h3 className="album-section-title">오늘의 추천 곡 (장르 기반)</h3>
            <div className="wrapping-song-list">
              {featuredSongs.map((song, index) => (
                <div key={`featured-${song.songId}`} className="song-card-item" onClick={() => onSongClick(index, featuredSongs)}>
                  <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                  <p className="song-card-title">{song.title}</p>
                  <p className="song-card-artist">{song.artistName}</p> {/* 🚨 artistName 사용 */}
                </div>
              ))}
            </div>
          </section>
        ) : null;

        // 모든 곡 셔플 섹션 (shuffledAllSongs가 있을 때만)
        const allSongsSection = shuffledAllSongs.length > 0 ? (
          <section className="album-song-section">
            <h3 className="album-section-title">모든 곡 둘러보기</h3>
            <div className="wrapping-song-list">
              {shuffledAllSongs.map((song, index) => (
                <div key={`shuffled-${song.songId}`} className="song-card-item" onClick={() => onSongClick(index, shuffledAllSongs)}>
                  <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                  <p className="song-card-title">{song.title}</p>
                  <p className="song-card-artist">{song.artistName}</p> {/* 🚨 artistName 사용 */}
                </div>
              ))}
            </div>
          </section>
        ) : null;

        return (
          <div className="vertical-album-list">
            {featuredSection}
            {allSongsSection}
            {!featuredSection && !allSongsSection && (
              <p className="loading-text">표시할 곡이 없습니다.</p>
            )}
          </div>
        );
      
      // --- 🚨 'Albums' 탭 (앨범별 곡 가로 스크롤 - '앨범화면.png' UI) ---
      case 'Albums':
        const albumIds = Object.keys(songsByAlbum);
        if (songs.length === 0) { // 곡이 없으면 앨범도 없음
            return <p className="loading-text">표시할 앨범이 없습니다.</p>;
        }
        return (
          <div className="vertical-album-list">
            {albumIds.map(albumId => {
              // 앨범 정보 찾기
              const album = albums.find(a => a.albumId === Number(albumId));
              const albumTitle = album ? album.title : "기타 곡";
              const albumCover = album ? album.coverUrl : '/logo192.png';
              // 이 앨범에 속한 곡 목록
              const songsInThisAlbum = songsByAlbum[albumId];

              return (
                <section key={albumId} className="album-song-section">
                  {/* 앨범 정보 헤더 (클릭 시 앨범 상세로 이동) */}
                  <div className="album-section-header" onClick={() => album ? onAlbumClick(album.albumId) : null}>
                     <img src={albumCover} alt={albumTitle} className="album-section-cover" />
                     <div className="album-section-info">
                         <p className="album-section-pretitle">앨범</p>
                         <h3 className="album-section-title">{albumTitle}</h3>
                     </div>
                  </div>
                  {/* 곡 목록 가로 스크롤 리스트 */}
                  <div className="horizontal-scroll-list">
                    {songsInThisAlbum.map((song, index) => (
                      <div 
                        key={song.songId} 
                        className="song-card-item" 
                        // 클릭 시 이 앨범 목록(songsInThisAlbum) 기준으로 재생
                        onClick={() => onSongClick(index, songsInThisAlbum)}
                      >
                        <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                        <p className="song-card-title">{song.title}</p>
                        <p className="song-card-artist">{song.artistName}</p> {/* 🚨 artistName 사용 */}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        );

      // --- 'Playlists' 탭 (기존 그리드 뷰 유지) ---
      case 'Playlists':
        return (
          <>
            <div className="create-playlist-inline-form">
              <input type="text" placeholder="새 재생목록 이름..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} disabled={isCreating} className="inline-input" />
              <button onClick={handleCreateNewPlaylist} disabled={isCreating} className="inline-button">
                {isCreating ? '생성 중...' : '만들기'}
              </button>
            </div>
            {/* Playlists 탭은 기존 그리드 뷰 사용 */}
            <div className="library-grid">
              {playlists.length > 0 ? playlists.map((playlist) => (
                <div key={`playlist-${playlist.playlistId}`} className="grid-item" onClick={() => onPlaylistClick(playlist.playlistId)}>
                  <img src={playlist.coverUrl || '/logo192.png'} alt={playlist.title} className="grid-item-cover" />
                  <p className="grid-item-title">{playlist.title}</p>
                </div>
              )) : <p className="loading-text">표시할 플레이리스트가 없습니다.</p>}
            </div>
          </>
        );
        
      default: return null;
    }
  };


  // --- LibraryView 컴포넌트 JSX 렌더링 ---
  return (
    <div className="library-container">
      {/* --- 햄버거 메뉴 (오버레이, 사이드바) --- */}
      {isMenuOpen && ( <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div> )}
      <div className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <span>탐색</span>
          <button onClick={() => setIsMenuOpen(false)} className="menu-close-btn">✕</button>
        </div>
        <ul className="menu-items">
          {/* 🚨 변경된 탭 순서 적용 (Songs, Albums, Playlists) */}
          {(['Songs', 'Albums', 'Playlists'] as LibraryTab[]).map((tab) => (
            <li key={tab} className="menu-item">
              <button
                className={`menu-item-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  setIsMenuOpen(false);
                }}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* --- 상단 헤더 --- */}
      <div className="library-header">
        <button onClick={() => setIsMenuOpen(true)} className="menu-button">☰</button>
        {/* 현재 활성화된 탭 이름을 제목으로 표시 */}
        <h1>{activeTab}</h1>
        <button onClick={handleSearchIconClick} className="search-button">🔍</button>
      </div>

      {/* --- 검색창 (활성화 시 표시) --- */}
      {isSearchVisible && (
          <div className="search-bar-active">
              <input
                  type="text"
                  placeholder="곡 제목 검색 (입력 시 자동 검색)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-active"
                  autoFocus
              />
              {/* (검색 로딩, 결과 목록, 결과 없음 메시지 렌더링) */}
              {isSearching && <p className="search-loading">검색 중...</p>}
              {!isSearching && searchResults.length > 0 && (
                  <ul className="search-results-active">
                      {searchResults.map((song) => (
                          <li
                              key={song.songId}
                              onClick={() => {
                                  onSearchResultClick(song); // 클릭 시 바로 재생
                                  setIsSearchVisible(false); // 검색창 닫기
                                  setSearchQuery('');
                                  setSearchResults([]);
                              }}
                              className="search-result-item"
                          >
                              {/* 🚨 [수정] getArtistName -> song.artistName */}
                               <span className="search-result-title">{song.title}</span>
                              <span className="search-result-artist">({song.artistName})</span>
                          </li>
                      ))}
                  </ul>
              )}
              {!isSearching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                  <p className="no-search-results">검색 결과가 없습니다.</p>
              )}
          </div>
      )}
      
      {/* --- 메인 컨텐츠 --- */}
      <div className="library-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default LibraryView; // 컴포넌트 내보내기

