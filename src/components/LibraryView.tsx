import React, { useState, useEffect } from 'react';
// 🚨 [수정] 설정된 axios 불러오기 (주소 자동 적용)
import axios from '../axiosConfig';
import { Playlist, Album, Artist, Song, LibraryTab, User } from '../types';

export interface WeatherRecommendation {
  weather: string;
  message: string;
  songs: Song[];
}

interface LibraryViewProps {
  playlists: Playlist[];
  albums: Album[];
  artists: Artist[];
  songs: Song[];
  featuredSongs: Song[];
  weatherRecommendation: WeatherRecommendation | null;
  recommendedSongs: Song[];
  popularSongs: Song[];
  recentSongs: Song[];
  
  // 🚨 [추가] 로그인한 사용자 정보 받기
  currentUser: User; 

  onPlaylistClick: (id: number) => void;
  onAlbumClick: (id: number) => void;
  onSongClick: (index: number, sourceList: Song[]) => void;
  refreshPlaylists: () => Promise<void>;
  onSearchResultClick: (song: Song) => void;
  onRecentPlaylistClick: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({
  playlists, albums, artists, songs, featuredSongs,
  recommendedSongs, popularSongs, weatherRecommendation, recentSongs,
  currentUser, // 🚨 [추가] 여기서 받음
  onPlaylistClick, onAlbumClick, onSongClick,
  refreshPlaylists,
  onSearchResultClick,
  onRecentPlaylistClick
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('Songs');
  
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 메뉴는 기본적으로 닫힌 상태

  // 컴포넌트 마운트 시 메뉴가 확실히 닫혀있는지 확인
  useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  // activeTab이 변경될 때도 메뉴 닫기
  useEffect(() => {
    setIsMenuOpen(false);
  }, [activeTab]);

  // --- 검색 로직 ---
  useEffect(() => {
    if (!isSearchVisible || !searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      try {
        // 🚨 [수정] axios 인스턴스 사용
        const response = await axios.get(`/api/songs/search`, { params: { query: searchQuery } });
        
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

  // --- 재생목록 생성 함수 (수정됨) ---
  const handleCreateNewPlaylist = async () => {
      if (!newPlaylistName.trim()) {
          alert('새 재생목록 이름을 입력해주세요.');
          return;
      }
      setIsCreating(true);
      try {
          // 🚨 [수정] userId를 함께 전송!
          const response = await axios.post('/api/playlists', {
              title: newPlaylistName,
              isPublic: true,
              songIds: [],
              userId: currentUser.userId // 👈 여기가 핵심입니다!
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
      case 'Songs':
        return (
          <div className="flex flex-col gap-8">
            {weatherRecommendation && weatherRecommendation.songs.length > 0 && (
                <section className="bg-gradient-to-br from-blue-800 to-blue-600 p-4 rounded-xl mb-5 shadow-xl">
                    <div className="flex items-center mb-2.5">
                        <span className="text-3xl mr-2.5">
                            {weatherRecommendation.weather === 'Rainy' ? '☔' : 
                             weatherRecommendation.weather === 'Snowy' ? '❄️' : '☀️'}
                        </span>
                        <div>
                            <h3 className="text-2xl font-bold text-white m-0">오늘의 날씨 추천</h3>
                            <p className="m-0 text-gray-200 text-sm">{weatherRecommendation.message}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 pt-2">
                        {weatherRecommendation.songs.map((song, index) => (
                        <div 
                          key={`weather-${song.songId}`} 
                          className="bg-dark-card/80 backdrop-blur-sm rounded-lg p-4 cursor-pointer transition-all duration-300 hover:bg-dark-hover hover:scale-105 hover:shadow-2xl group border border-gray-800/30 hover:border-spotify-green/30"
                          onClick={() => onSongClick(index, weatherRecommendation.songs)}
                        >
                            <div className="relative overflow-hidden rounded-md mb-3">
                              <img 
                                src={song.albumCoverUrl || '/logo192.png'} 
                                alt={song.title} 
                                className="w-full aspect-square object-cover shadow-lg group-hover:scale-110 transition-transform duration-500" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                            <p className="text-lg font-semibold text-white mt-2 mb-1 truncate group-hover:text-spotify-green transition-colors">{song.title}</p>
                            <p className="text-sm text-gray-400 m-0 truncate">{song.artistName}</p>
                        </div>
                        ))}
                    </div>
                </section>
            )}
            <section className="mb-4">
              <h3 className="text-2xl font-bold text-white mb-4">최신 업데이트 곡 🔥</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 pt-2">
                {recentSongs.length > 0 ? recentSongs.map((song, index) => (
                  <div 
                    key={`recent-${song.songId}`} 
                    className="bg-dark-card/80 backdrop-blur-sm rounded-lg p-4 cursor-pointer transition-all duration-300 hover:bg-dark-hover hover:scale-105 hover:shadow-2xl group border border-gray-800/30 hover:border-spotify-green/30"
                    onClick={() => onSongClick(index, recentSongs)}
                  >
                    <div className="relative overflow-hidden rounded-md mb-3">
                      <img 
                        src={song.albumCoverUrl || '/logo192.png'} 
                        alt={song.title} 
                        className="w-full aspect-square object-cover shadow-lg group-hover:scale-110 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <p className="text-lg font-semibold text-white mt-2 mb-1 truncate group-hover:text-spotify-green transition-colors">{song.title}</p>
                    <p className="text-sm text-gray-400 m-0 truncate">{song.artistName}</p>
                  </div>
                )) : <p className="text-gray-400 text-center py-8">최신 곡을 불러오는 중...</p>}
              </div>
            </section>
            <section className="mb-4">
              <h3 className="text-2xl font-bold text-white mb-4">추천곡</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 pt-2">
                {recommendedSongs.length > 0 ? recommendedSongs.map((song, index) => (
                  <div 
                    key={`rec-${song.songId}`} 
                    className="bg-dark-card/80 backdrop-blur-sm rounded-lg p-4 cursor-pointer transition-all duration-300 hover:bg-dark-hover hover:scale-105 hover:shadow-2xl group border border-gray-800/30 hover:border-spotify-green/30"
                    onClick={() => onSongClick(index, recommendedSongs)}
                  >
                    <div className="relative overflow-hidden rounded-md mb-3">
                      <img 
                        src={song.albumCoverUrl || '/logo192.png'} 
                        alt={song.title} 
                        className="w-full aspect-square object-cover shadow-lg group-hover:scale-110 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <p className="text-lg font-semibold text-white mt-2 mb-1 truncate group-hover:text-spotify-green transition-colors">{song.title}</p>
                    <p className="text-sm text-gray-400 m-0 truncate">{song.artistName}</p>
                  </div>
                )) : <p className="text-gray-400 text-center py-8">추천곡을 불러오는 중...</p>}
              </div>
            </section>
            <section className="mt-8">
              <h3 className="text-2xl font-bold text-white mb-4">인기곡</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 pt-2">
                {popularSongs.length > 0 ? popularSongs.map((song, index) => (
                  <div 
                    key={`pop-${song.songId}`} 
                    className="bg-dark-card/80 backdrop-blur-sm rounded-lg p-4 cursor-pointer transition-all duration-300 hover:bg-dark-hover hover:scale-105 hover:shadow-2xl group border border-gray-800/30 hover:border-spotify-green/30"
                    onClick={() => onSongClick(index, popularSongs)}
                  >
                    <div className="relative overflow-hidden rounded-md mb-3">
                      <img 
                        src={song.albumCoverUrl || '/logo192.png'} 
                        alt={song.title} 
                        className="w-full aspect-square object-cover shadow-lg group-hover:scale-110 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <p className="text-lg font-semibold text-white mt-2 mb-1 truncate group-hover:text-spotify-green transition-colors">{song.title}</p>
                    <p className="text-sm text-gray-400 m-0 truncate">{song.artistName}</p>
                  </div>
                )) : <p className="text-gray-400 text-center py-8">인기곡을 불러오는 중...</p>}
              </div>
            </section>
          </div>
        );
      case 'Albums':
        return (
           <div className="flex flex-col gap-8">
             {albums.map(album => (
               <section key={album.albumId} className="mb-4">
                 <div 
                   className="flex items-center gap-4 mb-4 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-800" 
                   onClick={() => onAlbumClick(album.albumId)}
                 >
                     <img 
                       src={album.coverUrl || '/logo192.png'} 
                       alt={album.title} 
                       className="w-15 h-15 object-cover rounded shadow-md flex-shrink-0" 
                     />
                     <div className="overflow-hidden">
                         <p className="text-xs text-gray-400 m-0 mb-1 uppercase font-semibold tracking-wide">앨범</p>
                         <h3 className="text-2xl font-bold text-white m-0">{album.title}</h3>
                     </div>
                  </div>
                  <p className="text-gray-500 pl-2">앨범을 클릭하여 수록곡을 확인하세요.</p>
               </section>
             ))}
           </div>
        );
      case 'Playlists':
        return (
          <>
            <div className="flex gap-2 mb-6 p-4 bg-dark-card rounded-lg">
              <input 
                type="text" 
                placeholder="새 재생목록 이름..." 
                value={newPlaylistName} 
                onChange={(e) => setNewPlaylistName(e.target.value)} 
                disabled={isCreating} 
                className="flex-grow px-3 py-2.5 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent disabled:opacity-50" 
              />
              <button 
                onClick={handleCreateNewPlaylist} 
                disabled={isCreating} 
                className="px-5 py-2.5 bg-spotify-green text-white border-none rounded-full cursor-pointer font-semibold hover:bg-spotify-green-hover transition-colors disabled:opacity-50"
              >
                {isCreating ? '생성 중...' : '만들기'}
              </button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-5">
              {/* 최근 재생 목록 버튼 추가 */}
              <div 
                className="bg-dark-card/80 backdrop-blur-sm p-4 rounded-lg cursor-pointer border-2 border-dashed border-gray-600 flex flex-col items-center justify-center min-h-[200px] text-center hover:border-spotify-green hover:bg-gray-800/50 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1" 
                onClick={onRecentPlaylistClick}
              >
                <div className="text-5xl mb-2.5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">🎵</div>
                <p className="text-white font-medium group-hover:text-spotify-green transition-colors">최근에 들은 곡</p>
              </div>
              {playlists.length > 0 ? playlists.map((playlist) => (
                <div 
                  key={`playlist-${playlist.playlistId}`} 
                  className="bg-dark-card p-4 rounded-lg cursor-pointer transition-all text-center hover:bg-dark-hover hover:-translate-y-1 hover:shadow-xl group"
                  onClick={() => onPlaylistClick(playlist.playlistId)}
                >
                  <img 
                    src={playlist.coverUrl || '/logo192.png'} 
                    alt={playlist.title} 
                    className="w-full aspect-square object-cover rounded-md mb-3 shadow-md group-hover:shadow-xl transition-shadow" 
                  />
                  <p className="text-white font-medium truncate">{playlist.title}</p>
                </div>
              )) : <p className="text-gray-400 text-center py-8 col-span-full">표시할 플레이리스트가 없습니다.</p>}
            </div>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="p-4 text-gray-200">
      {isMenuOpen && ( 
        <div 
          className="fixed inset-0 bg-black/50 z-[1001]" 
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(false);
          }}
        ></div> 
      )}
      <div 
        className={`fixed top-0 w-[280px] h-full bg-dark-card/95 backdrop-blur-xl shadow-2xl z-[1002] flex flex-col transition-all duration-300 ease-in-out border-r border-gray-800/50 ${
          isMenuOpen ? 'left-0' : '-left-[300px]'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: isMenuOpen ? 0 : '-300px',
          visibility: isMenuOpen ? 'visible' : 'hidden'
        }}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <span className="text-xl font-semibold text-white">메뉴</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
            }} 
            className="bg-transparent border-none text-gray-400 text-2xl cursor-pointer hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
        <ul className="list-none p-2 m-0 flex-grow overflow-y-auto">
          {(['Songs', 'Albums', 'Playlists'] as LibraryTab[]).map((tab) => (
            <li key={tab}>
              <button
                className={`w-full block bg-transparent border-none text-left p-3.5 text-lg font-medium cursor-pointer border-l-4 transition-all ${
                  activeTab === tab 
                    ? 'text-spotify-green border-spotify-green bg-gray-800 font-bold' 
                    : 'text-gray-300 border-transparent hover:bg-gray-700 hover:text-white'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
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

      <div className="flex justify-between items-center mb-6 px-2 sticky top-0 bg-dark-bg/95 backdrop-blur-sm z-10 pt-2.5 pb-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(true);
          }} 
          className="bg-transparent border-none text-gray-300 text-2xl cursor-pointer p-2 hover:text-spotify-green hover:scale-110 transition-all"
        >
          ☰
        </button>
        <h1 className="text-3xl font-bold text-white m-0 flex-grow text-center">{activeTab}</h1>
        <button 
          onClick={handleSearchIconClick} 
          className="bg-transparent border-none text-gray-300 text-2xl cursor-pointer p-2 hover:text-spotify-green hover:scale-110 transition-all mr-2"
        >
          🔍
        </button>
      </div>

      {isSearchVisible && (
          <div className="relative p-3 bg-dark-card rounded-lg mb-6">
              <input
                  type="text"
                  placeholder="곡 제목 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-600 bg-gray-700 text-gray-200 rounded-full text-base outline-none focus:border-spotify-green transition-colors"
                  autoFocus
              />
              {isSearching && <p className="text-gray-400 mt-2 text-center">검색 중...</p>}
              {!isSearching && searchResults.length > 0 && (
                  <ul className="absolute top-full left-3 right-3 bg-gray-700 border border-gray-600 border-t-0 rounded-b-lg max-h-[300px] overflow-y-auto z-20 shadow-xl">
                      {searchResults.map((song) => (
                          <li
                              key={song.songId}
                              onClick={() => {
                                  onSearchResultClick(song);
                                  setIsSearchVisible(false);
                                  setSearchQuery('');
                                  setSearchResults([]);
                              }}
                              className="px-4 py-3 text-gray-300 cursor-pointer border-b border-gray-600 flex justify-between items-center hover:bg-gray-600 transition-colors"
                          >
                               <span className="font-medium text-white">{song.title}</span>
                              <span className="text-sm text-gray-400">({song.artistName})</span>
                          </li>
                      ))}
                  </ul>
              )}
              {!isSearching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                  <p className="text-gray-400 mt-2 text-center">검색 결과가 없습니다.</p>
              )}
          </div>
      )}
      
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default LibraryView;