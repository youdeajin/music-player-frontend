import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from './axiosConfig'; // 🚨 [수정] axiosConfig 사용

// 컴포넌트 임포트
import LibraryView, { WeatherRecommendation } from './components/LibraryView';
import PlaylistDetailView from './components/PlaylistDetailView';
import NowPlayingView from './components/NowPlayingView';
import MiniPlayer from './components/MiniPlayer';
import Chatbot from './components/Chatbot';
import LoginView from './components/LoginView';
import SignupView from './components/SignupView';
import RecentPlaylistView from './components/RecentPlaylistView';

// 공유 타입 임포트
import { Song, Playlist, View, Artist, Album, User } from './types';

import './index.css';

function App() {
  // --- 로그인 관련 상태 ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // --- 기존 상태 변수 ---
  const [currentView, setCurrentView] = useState<View>('library');
  const [playerSongs, setPlayerSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSong = playerSongs[currentSongIndex];

  const [weatherData, setWeatherData] = useState<WeatherRecommendation | null>(null);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [featuredSongs, setFeaturedSongs] = useState<Song[]>([]);

  // 재생 기록 저장 함수
  const recordPlayHistory = useCallback(async (songId: number) => {
    if (!currentUser) return;
    
    try {
      await axios.post('/api/play-history', {
        userId: currentUser.userId,
        songId: songId
      });
    } catch (error) {
      console.error("재생 기록 저장 실패:", error);
    }
  }, [currentUser]);

  // 플레이어 관련 함수들
  const playSongAtIndex = useCallback((index: number, songList: Song[] = playerSongs) => {
    if (songList && songList[index]) {
      if (JSON.stringify(songList) !== JSON.stringify(playerSongs)) {
          setPlayerSongs(songList);
      }
      setCurrentSongIndex(index);
      setIsPlaying(true);
      setCurrentView('nowPlaying');
      
      // 재생 기록 저장
      if (songList[index]?.songId) {
        recordPlayHistory(songList[index].songId);
      }
    }
  }, [playerSongs, recordPlayHistory]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (currentSong) audioRef.current.play().catch(e => console.error("재생 실패:", e));
    }
  }, [isPlaying, currentSong]);

  const handleNext = useCallback(() => {
    if (playerSongs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % playerSongs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
    
    // 재생 기록 저장
    if (playerSongs[nextIndex]?.songId) {
      recordPlayHistory(playerSongs[nextIndex].songId);
    }
  }, [currentSongIndex, playerSongs, recordPlayHistory]);

  const handlePrev = useCallback(() => {
    if (playerSongs.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setIsPlaying(true);
      if (!isPlaying) audioRef.current.play().catch(e => console.error("재생 실패:", e));
    } else {
      const prevIndex = (currentSongIndex - 1 + playerSongs.length) % playerSongs.length;
      setCurrentSongIndex(prevIndex);
      setIsPlaying(true);
    }
  }, [currentSongIndex, playerSongs.length, isPlaying]);

   // 내 재생목록만 불러오기
   const refreshPlaylists = useCallback(async () => {
       if (!currentUser) return;

       try {
           const playlistsRes = await axios.get<Playlist[]>(`/api/playlists/user/${currentUser.userId}`);
           const placeholderCover = '/logo192.png';
           setAllPlaylists(
               (Array.isArray(playlistsRes.data) ? playlistsRes.data : [])
               .map(p => ({ ...p, coverUrl: p.coverUrl || placeholderCover }))
           );
       } catch (error) {
           console.error("재생목록 새로고침 실패:", error);
       }
   }, [currentUser]);

   const loadAlbumSongsToPlayer = useCallback(async (albumId: number, albumTitle: string) => {
       try {
           const response = await axios.get(`/api/albums/${albumId}/songs`);
           if (response.data && Array.isArray(response.data)) {
               const songsWithDetails = response.data.map((song: Song) => {
                   const artist = allArtists.find(a => a.artistId === song.artistId);
                   const album = allAlbums.find(al => al.albumId === song.albumId);
                   return { ...song, artistName: artist?.name, albumCoverUrl: album?.coverUrl || '/logo192.png' };
               });

               if (songsWithDetails.length > 0) {
                   setPlayerSongs(songsWithDetails);
                   setCurrentSongIndex(0);
                   setIsPlaying(false);
                   alert(`'${albumTitle}' 앨범의 곡 ${songsWithDetails.length}개를 로드했습니다.`);
               } else {
                    alert(`'${albumTitle}' 앨범에 곡이 없습니다.`);
                    setPlayerSongs([]);
                    setCurrentSongIndex(0);
                    setIsPlaying(false);
               }
           }
       } catch (error) {
           console.error(`앨범 곡 로딩 실패 (ID: ${albumId}):`, error);
           setPlayerSongs([]);
       }
   }, [allArtists, allAlbums]);

   const playSingleSong = useCallback((songToPlay: Song) => {
       setPlayerSongs([songToPlay]);
       setCurrentSongIndex(0);
       setIsPlaying(true);
       setCurrentView('nowPlaying');
       
       // 재생 기록 저장
       if (songToPlay?.songId) {
         recordPlayHistory(songToPlay.songId);
       }
   }, [recordPlayHistory]);

   // AI 추천 재생목록 생성 시 userId 포함
   const handleRecommendationResult = async (recommendedSongs: Song[], prompt: string) => {
     if (!currentUser) {
         alert("재생목록을 생성하려면 로그인이 필요합니다.");
         return;
     }

     if (recommendedSongs.length > 0) {
        const songIds = recommendedSongs.map(song => song.songId);
        let newTitle = `AI 추천: ${prompt}`;
        if (newTitle.length > 20) {
            newTitle = newTitle.substring(0, 20) + "...";
        }

        try {
          const response = await axios.post('/api/playlists', {
            title: newTitle,
            isPublic: true,
            songIds: songIds,
            userId: currentUser.userId
          });

          if (response.status === 201) {
            alert(`AI 추천 재생목록 생성 완료!`);
            await refreshPlaylists();
            setCurrentView('library');
          }
        } catch (error) {
          console.error("AI 추천 재생목록 생성 실패:", error);
          alert("재생목록 생성 중 오류가 발생했습니다.");
        }
     } else {
       alert("추천된 곡 중 앱의 DB에서 찾을 수 있는 곡이 없습니다.");
     }
   };
   
   const handleDeletePlaylist = useCallback(async (playlistId: number, playlistTitle: string) => {
    if (window.confirm(`정말로 재생목록 '${playlistTitle}'을(를) 삭제하시겠습니까?`)) {
      try {
        const response = await axios.delete(`/api/playlists/${playlistId}`);
        if (response.status === 204) { 
          alert(`재생목록 '${playlistTitle}' 삭제 완료!`);
          setCurrentView('library');
          await refreshPlaylists();
        }
      } catch (error) {
        console.error("재생목록 삭제 실패:", error);
        alert("재생목록 삭제 중 오류가 발생했습니다.");
      }
    }
  }, [refreshPlaylists]);


   const navigateToLibrary = () => setCurrentView('library');
   const navigateToPlaylistDetail = (playlistId: number) => { setSelectedPlaylistId(playlistId); setSelectedAlbumId(null); setSelectedArtistId(null); setCurrentView('playlistDetail'); };
   const navigateToAlbumDetail = (albumId: number) => { setSelectedAlbumId(albumId); setSelectedPlaylistId(null); setSelectedArtistId(null); setCurrentView('playlistDetail'); };
   const navigateToNowPlaying = () => { if(currentSong) setCurrentView('nowPlaying'); };
   const navigateToRecentPlaylist = () => { setCurrentView('recentPlaylist'); };


  // --- 데이터 로딩 useEffect ---
  useEffect(() => {
    if (!currentUser) return;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [playlistsRes, albumsRes, artistsRes] = await Promise.all([
          axios.get<Playlist[]>(`/api/playlists/user/${currentUser.userId}`),
          axios.get<Album[]>('/api/albums'),
          axios.get<Artist[]>('/api/artists'),
        ]);

        const loadedPlaylists = Array.isArray(playlistsRes.data) ? playlistsRes.data : [];
        const loadedAlbums = Array.isArray(albumsRes.data) ? albumsRes.data : [];
        const loadedArtists = Array.isArray(artistsRes.data) ? artistsRes.data : [];

        const placeholderCover = '/logo192.png';
        const processedAlbums = loadedAlbums.map(a => ({ ...a, coverUrl: a.coverUrl || placeholderCover }));
        const processedArtists = loadedArtists.map(ar => ({ ...ar, imageUrl: ar.imageUrl || placeholderCover }));
        const processedPlaylists = loadedPlaylists.map(p => ({...p, coverUrl: p.coverUrl || placeholderCover}));

        setAllPlaylists(processedPlaylists);
        setAllAlbums(processedAlbums);
        setAllArtists(processedArtists);

        const processSongs = (rawSongs: Song[]) => rawSongs.map(s => {
             const album = processedAlbums.find(a => a.albumId === s.albumId);
             const artist = processedArtists.find(ar => ar.artistId === s.artistId);
             return { 
                 ...s, 
                 albumCoverUrl: album?.coverUrl || placeholderCover, 
                 artistName: artist?.name || `ID ${s.artistId}`
             };
        });

        try {
            const [recRes, popRes, recentRes] = await Promise.all([
                axios.get<Song[]>('/api/songs/random', { params: { limit: 16 } }),
                axios.get<Song[]>('/api/songs/popular', { params: { limit: 16 } }),
                axios.get<Song[]>('/api/songs/recent')
            ]);

            setRecommendedSongs(processSongs(recRes.data));
            setPopularSongs(processSongs(popRes.data));
            setRecentSongs(processSongs(recentRes.data));
        } catch (e) {
            console.error("추천/인기곡 로딩 실패:", e);
        }

        try {
            const weatherRes = await axios.get('/api/recommendations/weather');
            const processedWeatherSongs = weatherRes.data.songs.map((s: any) => {
                 const album = processedAlbums.find(a => a.albumId === s.albumId);
                 const artist = processedArtists.find(ar => ar.artistId === s.artistId);
                 return { 
                     ...s, 
                     albumCoverUrl: album?.coverUrl || placeholderCover, 
                     artistName: artist?.name || `ID ${s.artistId}`
                 };
            });

            setWeatherData({
                weather: weatherRes.data.weather,
                message: weatherRes.data.message,
                songs: processedWeatherSongs
            });
            
        } catch (e) {
            console.error("날씨 추천 로딩 실패:", e);
        }

      } catch (error) {
        console.error("초기 데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleAudioPlay = () => setIsPlaying(true);
      const handleAudioPause = () => setIsPlaying(false);
      const handleAudioEnded = () => handleNext();

      audio.addEventListener('play', handleAudioPlay);
      audio.addEventListener('pause', handleAudioPause);
      audio.addEventListener('ended', handleAudioEnded);

      return () => {
        audio.removeEventListener('play', handleAudioPlay);
        audio.removeEventListener('pause', handleAudioPause);
        audio.removeEventListener('ended', handleAudioEnded);
      };
    }
  }, [handleNext]);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.src = currentSong.filePath;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(e => {
            console.error("곡 변경 후 자동 재생 실패:", e);
            setIsPlaying(false);
        });
      }
    } else if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        setIsPlaying(false);
        setCurrentSongIndex(0);
      }
  }, [currentSong, isPlaying]);


  if (!currentUser) {
    return (
      <div className="App">
        {authView === 'login' ? (
          <LoginView 
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setIsLoading(true);
            }} 
            onSwitchToSignup={() => setAuthView('signup')} 
          />
        ) : (
          <SignupView onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <div className={`App ${currentView === 'nowPlaying' ? 'now-playing-active' : ''}`}>
      <audio ref={audioRef} />

      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1005 }}>
        <span style={{ color: '#aaa', marginRight: '10px' }}>{currentUser.nickname}님</span>
        <button 
          onClick={() => {
            if(window.confirm("로그아웃 하시겠습니까?")) {
              setCurrentUser(null);
              setPlayerSongs([]);
              setIsPlaying(false);
            }
          }}
          style={{ background: '#333', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
        >
          로그아웃
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state-full"><p>앱 로딩 중...</p></div>
      ) : (
        <>
          <div className="main-view">
             {currentView === 'library' && (
               <LibraryView
                 playlists={allPlaylists}
                 albums={allAlbums}
                 artists={allArtists}
                 weatherRecommendation={weatherData} 
                 recentSongs={recentSongs} 
                 recommendedSongs={recommendedSongs}
                 popularSongs={popularSongs}
                 songs={[]} 
                 featuredSongs={featuredSongs}
                 currentUser={currentUser} // 🚨 [필수] 여기서 유저 정보 전달!
                 onPlaylistClick={navigateToPlaylistDetail}
                 onAlbumClick={navigateToAlbumDetail}
                 onSongClick={playSongAtIndex}
                 refreshPlaylists={refreshPlaylists}
                 onSearchResultClick={playSingleSong}
                 onRecentPlaylistClick={navigateToRecentPlaylist}
               />
             )}
             {currentView === 'playlistDetail' && (selectedPlaylistId || selectedAlbumId) && (
                  <PlaylistDetailView
                      playlistId={selectedPlaylistId}
                      albumId={selectedAlbumId}
                      onSongClick={playSongAtIndex}
                      onBackClick={navigateToLibrary}
                      currentSongId={currentSong?.songId}
                      isPlaying={isPlaying}
                      loadAlbumSongsToPlayer={loadAlbumSongsToPlayer}
                      allArtists={allArtists}
                      allAlbums={allAlbums}
                      onDeletePlaylist={handleDeletePlaylist}
                  />
              )}
              {currentView === 'recentPlaylist' && currentUser && (
                  <RecentPlaylistView
                      userId={currentUser.userId}
                      onSongClick={playSongAtIndex}
                      onBackClick={navigateToLibrary}
                      currentSongId={currentSong?.songId}
                      isPlaying={isPlaying}
                      allArtists={allArtists}
                      allAlbums={allAlbums}
                  />
              )}
              {currentView === 'nowPlaying' && currentSong && (
                  <NowPlayingView
                      song={currentSong}
                      isPlaying={isPlaying}
                      audioRef={audioRef}
                      onPlayPause={handlePlayPause}
                      onNext={handleNext}
                      onPrev={handlePrev}
                      onBackClick={navigateToLibrary}
                  />
              )}
          </div>

          {currentView !== 'nowPlaying' && currentSong && (
              <MiniPlayer
                  song={currentSong}
                  isPlaying={isPlaying}
                  onPlayPauseClick={handlePlayPause}
                  onNextClick={handleNext}
                  onClick={navigateToNowPlaying}
              />
          )}
        </>
      )}
      <Chatbot 
        onRecommendationResult={handleRecommendationResult} 
        allArtists={allArtists} 
      />
    </div>
  );
}
export default App;