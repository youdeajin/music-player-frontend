import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Playlist, Album, Artist, Song, LibraryTab } from '../types';
import './LibraryView.css';

// 🚨 [추가] 날씨 추천 응답 타입 정의
export interface WeatherRecommendation {
  weather: string;
  message: string;
  songs: Song[];
}

interface LibraryViewProps {
  playlists: Playlist[];
  albums: Album[];
  artists: Artist[];
  songs: Song[]; // (호환성을 위해 남겨두지만 실제로는 빈 배열이 옴)
  featuredSongs: Song[]; // (사용하지 않음)
  weatherRecommendation: WeatherRecommendation | null; // 🚨 [추가] 날씨 추천 응답 타입
  // 🚨 [수정] 새로 추가된 Props
  recommendedSongs: Song[];
  popularSongs: Song[];

  recentSongs: Song[]; // 🚨 [추가] 최신곡

  onPlaylistClick: (id: number) => void;
  onAlbumClick: (id: number) => void;
  onSongClick: (index: number, sourceList: Song[]) => void;
  refreshPlaylists: () => Promise<void>;
  onSearchResultClick: (song: Song) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({
  playlists, albums, artists, songs, featuredSongs,
  recommendedSongs, popularSongs, weatherRecommendation, recentSongs, // 🚨 추가된 props
  onPlaylistClick, onAlbumClick, onSongClick,
  refreshPlaylists,
  onSearchResultClick
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('Songs');
  
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- 검색 로직 ---
  useEffect(() => {
    if (!isSearchVisible || !searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const response = await axios.get(`https://localhost:8443/api/songs/search`, { params: { query: searchQuery } });
        
        const processedSearchResults = (Array.isArray(response.data) ? response.data : []).map(song => {
            const artist = artists.find(a => a.artistId === song.artistId);
            const album = albums.find(al => al.albumId === song.albumId);
            return {
                ...song,
                artistName: artist?.name || `ID ${song.artistId}`,
                albumCoverUrl: album?.coverUrl || '/logo192.png'
            };
        });
        setSearchResults(processedSearchResults);
        
      } catch (error) { console.error("곡 검색 실패:", error); setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, isSearchVisible, artists, albums]);

  const handleSearchIconClick = () => {
      setIsSearchVisible(!isSearchVisible);
      if (isSearchVisible) {
          setSearchQuery('');
          setSearchResults([]);
      }
  };

  // --- 헬퍼 함수 ---
  const handleCreateNewPlaylist = async () => {
      if (!newPlaylistName.trim()) {
          alert('새 재생목록 이름을 입력해주세요.');
          return;
      }
      setIsCreating(true);
      try {
          const response = await axios.post('https://localhost:8443/api/playlists', {
              title: newPlaylistName,
              isPublic: true,
              songIds: []
          });

          if (response.status === 201) {
              alert(`'${newPlaylistName}' 재생목록 생성 완료!`);
              setNewPlaylistName('');
              await refreshPlaylists();
          }
      } catch (error) {
          console.error("새 재생목록 생성 실패:", error);
          alert('재생목록 생성 중 오류가 발생했습니다.');
      } finally {
          setIsCreating(false);
      }
  };

  // --- 탭 컨텐츠 렌더링 ---
  const renderContent = () => {
    switch (activeTab) {

      // --- 🚨 'Songs' 탭: 추천곡 & 인기곡 섹션 ---
      case 'Songs':
        return (
          <div className="vertical-album-list">
            {/* 🚨 [새로 추가] 날씨 추천 섹션 (맨 위에 배치) */}
            {weatherRecommendation && weatherRecommendation.songs.length > 0 && (
                <section className="album-song-section weather-section" style={{ background: 'linear-gradient(45deg, #2c3e50, #3498db)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '2rem', marginRight: '10px' }}>
                            {weatherRecommendation.weather === 'Rainy' ? '☔' : 
                             weatherRecommendation.weather === 'Snowy' ? '❄️' : '☀️'}
                        </span>
                        <div>
                            <h3 className="album-section-title" style={{ margin: 0, color: 'white' }}>오늘의 날씨 추천</h3>
                            <p style={{ margin: 0, color: '#e0e0e0', fontSize: '0.9rem' }}>{weatherRecommendation.message}</p>
                        </div>
                    </div>
                    
                    <div className="wrapping-song-list">
                        {weatherRecommendation.songs.map((song, index) => (
                        <div key={`weather-${song.songId}`} className="song-card-item" onClick={() => onSongClick(index, weatherRecommendation.songs)}>
                            <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                            <p className="song-card-title" style={{ color: 'white' }}>{song.title}</p>
                            <p className="song-card-artist" style={{ color: '#ccc' }}>{song.artistName}</p>
                        </div>
                        ))}
                    </div>
                </section>
            )}
            {/* 🚨 [새로 추가] 최신 업데이트 곡 섹션 (맨 위 또는 날씨 아래에 배치) */}
            <section className="album-song-section">
              <h3 className="album-section-title">최신 업데이트 곡 🔥</h3>
              <div className="wrapping-song-list">
                {recentSongs.length > 0 ? recentSongs.map((song, index) => (
                  <div key={`recent-${song.songId}`} className="song-card-item" onClick={() => onSongClick(index, recentSongs)}>
                    <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                    <p className="song-card-title">{song.title}</p>
                    <p className="song-card-artist">{song.artistName}</p>
                  </div>
                )) : <p className="loading-text">최신 곡을 불러오는 중...</p>}
              </div>
            </section>
            {/* 1. 추천곡 섹션 */}
            <section className="album-song-section">
              <h3 className="album-section-title">추천곡</h3>
              <div className="wrapping-song-list">
                {recommendedSongs.length > 0 ? recommendedSongs.map((song, index) => (
                  <div key={`rec-${song.songId}`} className="song-card-item" onClick={() => onSongClick(index, recommendedSongs)}>
                    <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                    <p className="song-card-title">{song.title}</p>
                    <p className="song-card-artist">{song.artistName}</p>
                  </div>
                )) : <p className="loading-text">추천곡을 불러오는 중...</p>}
              </div>
            </section>
            
            {/* 2. 인기곡 섹션 */}
            <section className="album-song-section" style={{ marginTop: '2rem' }}>
              <h3 className="album-section-title">인기곡</h3>
              <div className="wrapping-song-list">
                {popularSongs.length > 0 ? popularSongs.map((song, index) => (
                  <div key={`pop-${song.songId}`} className="song-card-item" onClick={() => onSongClick(index, popularSongs)}>
                    <img src={song.albumCoverUrl || '/logo192.png'} alt={song.title} className="song-card-cover" />
                    <p className="song-card-title">{song.title}</p>
                    <p className="song-card-artist">{song.artistName}</p>
                  </div>
                )) : <p className="loading-text">인기곡을 불러오는 중...</p>}
              </div>
            </section>

          </div>
        );
      
      case 'Albums':
        // 앨범 목록 로직 (기존 songs 의존성 제거를 위해 albums만 사용하여 렌더링하도록 간단히 수정하거나 유지)
        // 여기서는 albums 정보를 기반으로 간단히 표시합니다.
        return (
           <div className="vertical-album-list">
             {albums.map(album => (
               <section key={album.albumId} className="album-song-section">
                 <div className="album-section-header" onClick={() => onAlbumClick(album.albumId)}>
                     <img src={album.coverUrl || '/logo192.png'} alt={album.title} className="album-section-cover" />
                     <div className="album-section-info">
                         <p className="album-section-pretitle">앨범</p>
                         <h3 className="album-section-title">{album.title}</h3>
                     </div>
                  </div>
                  <p style={{color:'#777', paddingLeft:'0.5rem'}}>앨범을 클릭하여 수록곡을 확인하세요.</p>
               </section>
             ))}
           </div>
        );

      case 'Playlists':
        return (
          <>
            <div className="create-playlist-inline-form">
              <input type="text" placeholder="새 재생목록 이름..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} disabled={isCreating} className="inline-input" />
              <button onClick={handleCreateNewPlaylist} disabled={isCreating} className="inline-button">
                {isCreating ? '생성 중...' : '만들기'}
              </button>
            </div>
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

  return (
    <div className="library-container">
      {isMenuOpen && ( <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div> )}
      <div className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <span>탐색</span>
          <button onClick={() => setIsMenuOpen(false)} className="menu-close-btn">✕</button>
        </div>
        <ul className="menu-items">
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

      <div className="library-header">
        <button onClick={() => setIsMenuOpen(true)} className="menu-button">☰</button>
        <h1>{activeTab}</h1>
        <button onClick={handleSearchIconClick} className="search-button">🔍</button>
      </div>

      {isSearchVisible && (
          <div className="search-bar-active">
              <input
                  type="text"
                  placeholder="곡 제목 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-active"
                  autoFocus
              />
              {isSearching && <p className="search-loading">검색 중...</p>}
              {!isSearching && searchResults.length > 0 && (
                  <ul className="search-results-active">
                      {searchResults.map((song) => (
                          <li
                              key={song.songId}
                              onClick={() => {
                                  onSearchResultClick(song);
                                  setIsSearchVisible(false);
                                  setSearchQuery('');
                                  setSearchResults([]);
                              }}
                              className="search-result-item"
                          >
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
      
      <div className="library-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default LibraryView;