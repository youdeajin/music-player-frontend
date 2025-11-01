import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// 컴포넌트 임포트
import LibraryView from './components/LibraryView';
import PlaylistDetailView from './components/PlaylistDetailView';
import NowPlayingView from './components/NowPlayingView';
import MiniPlayer from './components/MiniPlayer';
import Chatbot from './components/Chatbot';

// 공유 타입 임포트 (src/types.ts 파일 필요)
import { Song, Playlist, View, Artist, Album } from './types';

// 기본 CSS 임포트
import './index.css';

function App() {
  // --- 상태 변수 정의 (기존 유지) ---
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

  // --- 데이터 로딩 상태 (라이브러리 뷰용) ---
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [featuredSongs, setFeaturedSongs] = useState<Song[]>([]);

  // --- 콜백 함수 정의 (useCallback) ---

  // 🚨 [수정] 재생 목록(songList)의 특정 인덱스(index) 곡을 재생하고 NowPlaying 뷰로 이동
  const playSongAtIndex = useCallback((index: number, songList: Song[] = playerSongs) => {
    if (songList && songList[index]) {
      // 현재 플레이어 목록(playerSongs)과 다른 목록이면 교체
      if (JSON.stringify(songList) !== JSON.stringify(playerSongs)) {
          setPlayerSongs(songList);
      }
      // 선택된 곡의 인덱스로 업데이트
      setCurrentSongIndex(index);
      // 재생 상태를 true로 설정하여 재생 시작
      setIsPlaying(true);
      // 🚨 [추가] 즉시 'NowPlaying' 화면으로 전환
      setCurrentView('nowPlaying');
    }
  }, [playerSongs]); // playerSongs 참조가 변경될 때만 함수 재생성

  // 재생/일시정지 토글 함수
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

  // 다음 곡 재생 함수
  const handleNext = useCallback(() => {
    if (playerSongs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % playerSongs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  }, [currentSongIndex, playerSongs.length]);

  // 이전 곡 재생 함수
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

  // 재생목록 목록을 새로고침하는 함수
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

   // 앨범 곡 로드 함수
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

   // 검색 결과 클릭 시 단일 곡 재생 및 NowPlaying 화면으로 이동
   const playSingleSong = useCallback((songToPlay: Song) => {
       setPlayerSongs([songToPlay]);
       setCurrentSongIndex(0);
       setIsPlaying(true);
       setCurrentView('nowPlaying'); // NowPlaying 화면으로 즉시 이동
   }, []);

   // 챗봇 결과 처리 함수
   
   // 🚨 [수정] 챗봇 결과 처리 함수: 추천 곡으로 "새 재생목록 생성"
   const handleRecommendationResult = async (recommendedSongs: Song[], prompt: string) => {
     if (recommendedSongs.length > 0) {
        // 1. 추천 곡 목록에서 ID 추출
        const songIds = recommendedSongs.map(song => song.songId);

        // 2. 사용자 프롬프트를 기반으로 새 재생목록 제목 생성
        let newTitle = `AI 추천 재생목록`;
        // 제목이 너무 길면 자르기 (예: 20자)
        if (newTitle.length > 20) {
            newTitle = newTitle.substring(0, 20) + "...";
        }

        console.log(`AI 추천 재생목록 생성)`);

        try {
          // 3. 백엔드 재생목록 생성 API 호출
          const response = await axios.post('https://localhost:8443/api/playlists', {
            title: newTitle,
            isPublic: true,
            songIds: songIds // 추천받은 곡 ID 목록 전달
          });

          if (response.status === 201) {
            alert(`AI 추천 재생목록 생성 완료!`);
            // 4. 라이브러리의 재생목록 탭 새로고침
            await refreshPlaylists();
            // 5. 생성된 재생목록 상세 뷰로 이동 (선택적)
            // navigateToPlaylistDetail(response.data.playlistId);
            // 6. 또는 라이브러리 뷰로 이동
            setCurrentView('library');
          }
        } catch (error) {
          console.error("AI 추천 재생목록 생성 실패:", error);
          alert("AI 추천 재생목록 생성 중 오류가 발생했습니다.");
        }
     } else {
       // 백엔드가 빈 배열을 반환한 경우 (DB에 없는 곡 추천)
       alert("추천된 곡 중 앱의 DB에서 찾을 수 있는 곡이 없습니다.");
     }
   };
   
    // 🚨 [새로 추가] 재생목록 삭제 함수 (App.tsx에서 관리)
   const handleDeletePlaylist = useCallback(async (playlistId: number, playlistTitle: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`정말로 재생목록 '${playlistTitle}'을(를) 삭제하시겠습니까?`)) {
      try {
        // 백엔드 삭제 API 호출
        const response = await axios.delete(`https://localhost:8443/api/playlists/${playlistId}`);
        
        if (response.status === 204) { // No Content (삭제 성공)
          alert(`재생목록 '${playlistTitle}' 삭제 완료!`);
          // 라이브러리 뷰로 이동
          setCurrentView('library');
          // 라이브러리의 재생목록 목록 새로고침
          await refreshPlaylists();
        }
      } catch (error) {
        console.error("재생목록 삭제 실패:", error);
        alert("재생목록 삭제 중 오류가 발생했습니다.");
      }
    }
  }, [refreshPlaylists]); // refreshPlaylists 함수에 의존


   // 화면 전환 함수들
   const navigateToLibrary = () => setCurrentView('library');
   const navigateToPlaylistDetail = (playlistId: number) => { setSelectedPlaylistId(playlistId); setSelectedAlbumId(null); setSelectedArtistId(null); setCurrentView('playlistDetail'); };
   const navigateToAlbumDetail = (albumId: number) => { setSelectedAlbumId(albumId); setSelectedPlaylistId(null); setSelectedArtistId(null); setCurrentView('playlistDetail'); };
   const navigateToArtistDetail = (artistId: number) => { setSelectedArtistId(artistId); alert(`Artist ID ${artistId} 상세 화면 구현 필요`); };
   const navigateToNowPlaying = () => { if(currentSong) setCurrentView('nowPlaying'); };


  // --- useEffect 훅 ---

  // 1. 초기 데이터 로딩
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [playlistsRes, albumsRes, artistsRes, songsRes] = await Promise.all([
          axios.get<Playlist[]>('https://localhost:8443/api/playlists'),
          axios.get<Album[]>('https://localhost:8443/api/albums'),
          axios.get<Artist[]>('https://localhost:8443/api/artists'),
          axios.get<Song[]>('https://localhost:8443/api/songs')
        ]);

        const loadedPlaylists = Array.isArray(playlistsRes.data) ? playlistsRes.data : [];
        const loadedAlbums = Array.isArray(albumsRes.data) ? albumsRes.data : [];
        const loadedArtists = Array.isArray(artistsRes.data) ? artistsRes.data : [];
        const loadedSongs = Array.isArray(songsRes.data) ? songsRes.data : [];

        // 데이터 가공 (커버 URL, 아티스트 이름 추가 등)
        const placeholderCover = '/logo192.png';
        const processedAlbums = loadedAlbums.map(a => ({ ...a, coverUrl: a.coverUrl || placeholderCover }));
        const processedArtists = loadedArtists.map(ar => ({ ...ar, imageUrl: ar.imageUrl || placeholderCover }));
        const processedSongs = loadedSongs.map(s => {
             const album = processedAlbums.find(a => a.albumId === s.albumId);
             const artist = processedArtists.find(ar => ar.artistId === s.artistId);
             return { ...s, albumCoverUrl: album?.coverUrl || placeholderCover, artistName: artist?.name };
        });
        const processedPlaylists = loadedPlaylists.map(p => ({...p, coverUrl: p.coverUrl || placeholderCover}));

        // 상태 업데이트
        setAllPlaylists(processedPlaylists);
        setAllAlbums(processedAlbums);
        setAllArtists(processedArtists);
        setAllSongs(processedSongs);
        
        // 🚨 앱 시작 시 플레이어 큐는 비워둠 (초기화)
        setPlayerSongs([]); 
        setCurrentSongIndex(0);
        setIsPlaying(false);

        // --- 자동 추천 로직 ---
        if (processedAlbums.length === 0 && processedPlaylists.length === 0) {
          // ... (추천 곡 로드 로직 유지) ...
        } else { setFeaturedSongs([]); }

      } catch (error) {
        console.error("초기 데이터 로딩 실패:", error);
        setPlayerSongs([]); setAllPlaylists([]); setAllAlbums([]); setAllArtists([]); setAllSongs([]); setFeaturedSongs([]);
      } finally {
        setIsLoading(false); // 로딩 종료
      }
    };
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPlaylists]);

  // 3. 현재 곡(currentSong) 변경 시 오디오 소스 업데이트
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
        // 재생 목록 비었을 때 (초기 상태)
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        setIsPlaying(false);
        setCurrentSongIndex(0);
      }
  }, [currentSong, isPlaying]);

  // 2. 오디오 요소 이벤트 리스너 설정 (useCallback 함수들 정의된 이후)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleAudioPlay = () => setIsPlaying(true);
      const handleAudioPause = () => setIsPlaying(false);
      const handleAudioEnded = () => handleNext(); // 곡 종료 시 다음 곡

      audio.addEventListener('play', handleAudioPlay);
      audio.addEventListener('pause', handleAudioPause);
      audio.addEventListener('ended', handleAudioEnded);

      // 클린업 함수
      return () => {
        audio.removeEventListener('play', handleAudioPlay);
        audio.removeEventListener('pause', handleAudioPause);
        audio.removeEventListener('ended', handleAudioEnded);
      };
    }
  }, [handleNext]); // handleNext 의존성 유지


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
                 songs={allSongs}
                 featuredSongs={featuredSongs}
                 onPlaylistClick={navigateToPlaylistDetail}
                 onAlbumClick={navigateToAlbumDetail}
                 // 🚨 [수정] playSongAtIndex 함수를 직접 전달
                 onSongClick={playSongAtIndex}
                 refreshPlaylists={refreshPlaylists}
                 // 🚨 검색 결과 클릭 시 playSingleSong 함수 전달
                 onSearchResultClick={playSingleSong}
               />
             )}
             {currentView === 'playlistDetail' && (selectedPlaylistId || selectedAlbumId) && (
                  <PlaylistDetailView
                      playlistId={selectedPlaylistId}
                      albumId={selectedAlbumId}
                      // 🚨 [수정] playSongAtIndex 함수를 직접 전달
                      onSongClick={playSongAtIndex}
                      onBackClick={navigateToLibrary}
                      currentSongId={currentSong?.songId}
                      isPlaying={isPlaying}
                      loadAlbumSongsToPlayer={loadAlbumSongsToPlayer}
                      // 🚨 [새로 추가] props 전달
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

          {/* ----- 하단 미니 플레이어 ----- */}
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
      {/* 🚨 챗봇에 수정된 handleRecommendationResult 함수 전달 */}
      <Chatbot 
        onRecommendationResult={handleRecommendationResult} 
        allArtists={allArtists} 
      />
    </div>
  );
}
export default App;

