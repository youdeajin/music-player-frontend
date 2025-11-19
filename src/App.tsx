import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// 컴포넌트 임포트
import LibraryView, { WeatherRecommendation } from './components/LibraryView';
import PlaylistDetailView from './components/PlaylistDetailView';
import NowPlayingView from './components/NowPlayingView';
import MiniPlayer from './components/MiniPlayer';
import Chatbot from './components/Chatbot';

// 공유 타입 임포트
import { Song, Playlist, View, Artist, Album } from './types';

// 기본 CSS 임포트
import './index.css';

function App() {
  // --- 상태 변수 정의 ---
  const [currentView, setCurrentView] = useState<View>('library');
  const [playerSongs, setPlayerSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSong = playerSongs[currentSongIndex];

  // 🚨 [새로 추가] 날씨 추천 상태
  const [weatherData, setWeatherData] = useState<WeatherRecommendation | null>(null); 

  // --- 데이터 로딩 상태 ---
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  
  // 🚨 [수정] 추천곡과 인기곡 상태 분리
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [featuredSongs, setFeaturedSongs] = useState<Song[]>([]); // (기존 로직 유지용, 필요 없다면 제거 가능)
  
  //최신곡
  const [recentSongs, setRecentSongs] = useState<Song[]>([]); // 🚨 [추가]
  // --- 콜백 함수 정의 ---

  const playSongAtIndex = useCallback((index: number, songList: Song[] = playerSongs) => {
    if (songList && songList[index]) {
      if (JSON.stringify(songList) !== JSON.stringify(playerSongs)) {
          setPlayerSongs(songList);
      }
      setCurrentSongIndex(index);
      setIsPlaying(true);
      setCurrentView('nowPlaying');
    }
  }, [playerSongs]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (currentSong) {
          audioRef.current.play().catch(e => console.error("재생 실패:", e));
      }
    }
  }, [isPlaying, currentSong]);

  const handleNext = useCallback(() => {
    if (playerSongs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % playerSongs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  }, [currentSongIndex, playerSongs.length]);

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

   const refreshPlaylists = useCallback(async () => {
       try {
           const playlistsRes = await axios.get<Playlist[]>('https://localhost:8443/api/playlists');
           const placeholderCover = '/logo192.png';
           setAllPlaylists(
               (Array.isArray(playlistsRes.data) ? playlistsRes.data : [])
               .map(p => ({ ...p, coverUrl: p.coverUrl || placeholderCover }))
           );
       } catch (error) {
           console.error("재생목록 새로고침 실패:", error);
       }
   }, []);

   //앨범 곡 로드
   const loadAlbumSongsToPlayer = useCallback(async (albumId: number, albumTitle: string) => {
       try {
           const response = await axios.get(`https://localhost:8443/api/albums/${albumId}/songs`);
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
           } else { throw new Error("Invalid album songs data received"); }
       } catch (error) {
           console.error(`앨범 곡 로딩 실패 (ID: ${albumId}):`, error);
           alert(`'${albumTitle}' 앨범 곡 로딩 중 오류가 발생했습니다.`);
           setPlayerSongs([]);
           setCurrentSongIndex(0);
           setIsPlaying(false);
       }
   }, [allArtists, allAlbums]);

   const playSingleSong = useCallback((songToPlay: Song) => {
       setPlayerSongs([songToPlay]);
       setCurrentSongIndex(0);
       setIsPlaying(true);
       setCurrentView('nowPlaying');
   }, []);

   const handleRecommendationResult = async (recommendedSongs: Song[], prompt: string) => {
     if (recommendedSongs.length > 0) {
        const songIds = recommendedSongs.map(song => song.songId);
        let newTitle = `AI 추천 재생목록`;
        if (newTitle.length > 20) {
            newTitle = newTitle.substring(0, 20) + "...";
        }
        console.log(`AI 추천 재생목록 생성`);

        try {
          const response = await axios.post('https://localhost:8443/api/playlists', {
            title: newTitle,
            isPublic: true,
            songIds: songIds
          });

          if (response.status === 201) {
            alert(`AI 추천 재생목록 생성 완료!`);
            await refreshPlaylists();
            setCurrentView('library');
          }
        } catch (error) {
          console.error("AI 추천 재생목록 생성 실패:", error);
          alert("AI 추천 재생목록 생성 중 오류가 발생했습니다.");
        }
     } else {
       alert("추천된 곡 중 앱의 DB에서 찾을 수 있는 곡이 없습니다.");
     }
   };
   
   const handleDeletePlaylist = useCallback(async (playlistId: number, playlistTitle: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`정말로 재생목록 '${playlistTitle}'을(를) 삭제하시겠습니까?`)) {
      try {
        const response = await axios.delete(`https://localhost:8443/api/playlists/${playlistId}`);
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
   const navigateToArtistDetail = (artistId: number) => { setSelectedArtistId(artistId); alert(`Artist ID ${artistId} 상세 화면 구현 필요`); };
   const navigateToNowPlaying = () => { if(currentSong) setCurrentView('nowPlaying'); };


  // --- useEffect 훅 ---

  // 1. 초기 데이터 로딩 (전체 곡 로딩 제거 및 추천/인기곡 로딩 추가)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // 1. 플레이리스트, 앨범, 아티스트 정보 가져오기
        const [playlistsRes, albumsRes, artistsRes] = await Promise.all([
          axios.get<Playlist[]>('https://localhost:8443/api/playlists'),
          axios.get<Album[]>('https://localhost:8443/api/albums'),
          axios.get<Artist[]>('https://localhost:8443/api/artists'),
        ]);

        const loadedPlaylists = Array.isArray(playlistsRes.data) ? playlistsRes.data : [];
        const loadedAlbums = Array.isArray(albumsRes.data) ? albumsRes.data : [];
        const loadedArtists = Array.isArray(artistsRes.data) ? artistsRes.data : [];

        // 데이터 가공
        const placeholderCover = '/logo192.png';
        const processedAlbums = loadedAlbums.map(a => ({ ...a, coverUrl: a.coverUrl || placeholderCover }));
        const processedArtists = loadedArtists.map(ar => ({ ...ar, imageUrl: ar.imageUrl || placeholderCover }));
        const processedPlaylists = loadedPlaylists.map(p => ({...p, coverUrl: p.coverUrl || placeholderCover}));

        setAllPlaylists(processedPlaylists);
        setAllAlbums(processedAlbums);
        setAllArtists(processedArtists);

        // 헬퍼 함수: 곡 정보에 커버, 아티스트 매핑
        const processSongs = (rawSongs: Song[]) => rawSongs.map(s => {
             const album = processedAlbums.find(a => a.albumId === s.albumId);
             const artist = processedArtists.find(ar => ar.artistId === s.artistId);
             return { 
                 ...s, 
                 albumCoverUrl: album?.coverUrl || placeholderCover, 
                 artistName: artist?.name || `ID ${s.artistId}`
             };
        });

        // 🚨 [수정] 2. 추천곡 & 인기곡 가져오기 (각각 8곡씩 요청)
        try {
            // 🚨 [수정] limit 파라미터를 모두 16으로 변경
            const [recRes, popRes, recentRes] = await Promise.all([
                axios.get<Song[]>('https://localhost:8443/api/songs/random', { params: { limit: 16 } }), // 랜덤 16개
                axios.get<Song[]>('https://localhost:8443/api/songs/popular', { params: { limit: 16 } }), // 인기 16개
                axios.get<Song[]>('https://localhost:8443/api/songs/recent') // 최신곡 (백엔드에서 이미 16개로 설정됨)
            ]);

            setRecommendedSongs(processSongs(recRes.data));
            setPopularSongs(processSongs(popRes.data));
            setRecentSongs(processSongs(recentRes.data)); // 🚨 [추가]
        } catch (e) {
            console.error("추천/인기곡 로딩 실패:", e);
        }
        // 🚨 [새로 추가] 날씨 추천 API 호출
        try {
            const weatherRes = await axios.get('https://localhost:8443/api/recommendations/weather');
            
            // 헬퍼 함수(processSongs)를 이용해 커버/아티스트 정보 매핑 (기존 코드 활용)
            // processSongs 함수가 useEffect 안에 정의되어 있다면 사용, 아니면 여기서 유사하게 처리
            const rawWeatherSongs = weatherRes.data.songs;
            const processedWeatherSongs = rawWeatherSongs.map((s: any) => { // any 타입 임시 사용
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
        setPlayerSongs([]); 
        setCurrentSongIndex(0);
        setIsPlaying(false);
        setFeaturedSongs([]); 

      } catch (error) {
        console.error("초기 데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [refreshPlaylists]);

  // 2. 오디오 요소 이벤트 리스너 설정
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

  // 3. 현재 곡 변경 시 오디오 소스 업데이트
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


  // --- 렌더링 로직 ---
  return (
    <div className={`App ${currentView === 'nowPlaying' ? 'now-playing-active' : ''}`}>
      <audio ref={audioRef} />

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
                 weatherRecommendation={weatherData} // 🚨 [새로 추가] props 전달
                 recentSongs={recentSongs} // 🚨 [추가] 최신곡 props 전달
                 // 🚨 [수정] 변경된 props 전달
                 recommendedSongs={recommendedSongs}
                 popularSongs={popularSongs}
                 // 기존 props
                 songs={[]} // 전체 곡 목록은 더 이상 전달하지 않음 (빈 배열)
                 featuredSongs={featuredSongs}
                 onPlaylistClick={navigateToPlaylistDetail}
                 onAlbumClick={navigateToAlbumDetail}
                 onSongClick={playSongAtIndex}
                 refreshPlaylists={refreshPlaylists}
                 onSearchResultClick={playSingleSong}
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