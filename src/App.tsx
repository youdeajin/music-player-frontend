import React, { useState, useEffect, useRef, useCallback } from 'react'; // useRef, useCallback 추가
import axios from 'axios';
import LibraryView from './components/LibraryView';
import PlaylistDetailView from './components/PlaylistDetailView';
import NowPlayingView from './components/NowPlayingView';
import MiniPlayer from './components/MiniPlayer';
import Chatbot from './components/Chatbot';
import { Song, Playlist, View, Artist, Album } from './types'; // 타입 임포트 확인
import './index.css';


function App() {
  // --- 상태 변수들 ---
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

  // --- 데이터 로딩 상태 변수들 ---
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [featuredSongs, setFeaturedSongs] = useState<Song[]>([]); // 추천 곡 목록

  // 🚨 [새로 추가] 재생목록 목록을 다시 불러오는 함수
  const refreshPlaylists = useCallback(async () => {
    try {
      const playlistsRes = await axios.get<Playlist[]>('https://localhost:8443/api/playlists');
      // 임시 커버 URL 할당 등 필요한 처리 포함
      const placeholderCover = '/logo192.png';
      setAllPlaylists(
        (Array.isArray(playlistsRes.data) ? playlistsRes.data : [])
        .map(p => ({ ...p, coverUrl: p.coverUrl || placeholderCover }))
      );
    } catch (error) {
      console.error("재생목록 새로고침 실패:", error);
    }
  }, []); // 의존성 배열 비움 (App 마운트 시 생성)

  // 초기 데이터 로딩 (플레이리스트, 앨범, 아티스트, 모든 곡 + 추천 곡)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // 기본 데이터 병렬 로드
        const [playlistsRes, albumsRes, artistsRes, songsRes] = await Promise.all([
          axios.get<Playlist[]>('https://localhost:8443/api/playlists'), // HTTPS 확인
          axios.get<Album[]>('https://localhost:8443/api/albums'),
          axios.get<Artist[]>('https://localhost:8443/api/artists'),
          axios.get<Song[]>('https://localhost:8443/api/songs')
        ]);

        // API 응답 데이터를 변수에 저장 (타입 안정성 확보)
        const loadedPlaylists = Array.isArray(playlistsRes.data) ? playlistsRes.data : [];
        const loadedAlbums = Array.isArray(albumsRes.data) ? albumsRes.data : [];
        const loadedArtists = Array.isArray(artistsRes.data) ? artistsRes.data : [];
        const loadedSongs = Array.isArray(songsRes.data) ? songsRes.data : [];

        // 임시 커버 URL 할당 로직 (필요 시 수정)
        const placeholderCover = '/logo192.png'; // 기본 이미지 경로
        // Album 타입에 coverUrl이 있으므로, API 응답 우선 사용
        const processedAlbums = loadedAlbums.map(a => ({ ...a, coverUrl: a.coverUrl || placeholderCover }));
        // Artist 타입에 imageUrl이 있다고 가정 (types.ts 정의 필요)
        const processedArtists = loadedArtists.map(ar => ({ ...ar, imageUrl: ar.imageUrl || placeholderCover }));
        // Song 타입에 albumCoverUrl이 있다고 가정 (types.ts 정의 필요)
        const processedSongs = loadedSongs.map(s => {
             // 앨범 정보를 찾아 커버 URL 매핑
             const album = processedAlbums.find(a => a.albumId === s.albumId);
             return { ...s, albumCoverUrl: album?.coverUrl || placeholderCover };
        });
         // Playlist 타입에 coverUrl이 있다고 가정 (types.ts 정의 필요)
         const processedPlaylists = loadedPlaylists.map(p => ({...p, coverUrl: p.coverUrl || placeholderCover}));


        // 상태 업데이트
        setAllPlaylists(processedPlaylists);
        setAllAlbums(processedAlbums);
        setAllArtists(processedArtists);
        setAllSongs(processedSongs);

        // 초기 플레이어 목록 설정 (모든 곡)
        setPlayerSongs(processedSongs);
        await refreshPlaylists();

        // --- 🚨 자동 추천 로직 수정 ---
        // 🚨 if 조건문에서 try 블록 내의 변수 사용
        if (loadedAlbums.length === 0 && loadedPlaylists.length === 0) {
          console.log("앨범/플레이리스트 없음, 추천 곡 로드 시도...");
          try {
            // 백엔드의 장르 추천 API 호출
            const recommendRes = await axios.get<Song[]>(`https://localhost:8443/api/recommendations/genre`, {
              params: { genre: 'K-Pop', limit: 10 } // DB에 있는 장르로 변경
            });
            // 추천 곡 상태 업데이트 (앨범 커버 URL 포함하여 처리)
            const featuredWithCovers = (Array.isArray(recommendRes.data) ? recommendRes.data : []).map(s => {
                const album = processedAlbums.find(a => a.albumId === s.albumId);
                return { ...s, albumCoverUrl: album?.coverUrl || placeholderCover };
            });
            setFeaturedSongs(featuredWithCovers);
            console.log("추천 곡 로드 완료:", featuredWithCovers.length, "개");
          } catch (recommendError) {
            console.error("추천 곡 로딩 실패:", recommendError);
            setFeaturedSongs([]); // 오류 시 빈 배열
          }
        } else {
            setFeaturedSongs([]); // 앨범이나 플레이리스트 있으면 추천 곡은 비움
        }
        // --- 추천 로직 끝 ---

      } catch (error) {
        console.error("초기 데이터 로딩 실패:", error);
        // 모든 상태 초기화
        setPlayerSongs([]); setAllPlaylists([]); setAllAlbums([]); setAllArtists([]); setAllSongs([]); setFeaturedSongs([]);
      } finally {
        setIsLoading(false); // 로딩 종료
      }
    };
    fetchInitialData();
  }, [refreshPlaylists]); // 마운트 시 한 번만 실행

  // --- 기존 함수들 유지 ---
  const playSongAtIndex = useCallback((index: number, songList: Song[] = playerSongs) => {
    if (songList && songList[index]) {
      // 재생 목록이 실제로 변경되었는지 확인 후 업데이트 (불필요한 리렌더링 방지)
      if (JSON.stringify(songList) !== JSON.stringify(playerSongs)) {
          setPlayerSongs(songList);
      }
      setCurrentSongIndex(index);
      setIsPlaying(true); // 재생 시작
      // 오디오 요소를 직접 제어하는 대신 isPlaying 상태 변경으로 재생 트리거
    }
  }, [playerSongs]); // playerSongs가 변경될 때만 함수 재생성

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("재생 실패:", e));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (playerSongs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % playerSongs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  }, [currentSongIndex, playerSongs.length]);

  const handlePrev = useCallback(() => {
    if (playerSongs.length === 0) return;
    // 재생 시간이 3초 이상이면 처음부터 다시 재생, 아니면 이전 곡
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setIsPlaying(true); // 재생 상태 유지 또는 시작
      if (!isPlaying) audioRef.current.play().catch(e => console.error("재생 실패:", e));
    } else {
      const prevIndex = (currentSongIndex - 1 + playerSongs.length) % playerSongs.length;
      setCurrentSongIndex(prevIndex);
      setIsPlaying(true);
    }
  }, [currentSongIndex, playerSongs.length, isPlaying]);


  // --- 화면 전환 함수 ---
  const navigateToLibrary = () => setCurrentView('library');

  const navigateToPlaylistDetail = (playlistId: number) => {
    setSelectedPlaylistId(playlistId);
    setSelectedAlbumId(null); // 다른 ID 초기화
    setSelectedArtistId(null);
    setCurrentView('playlistDetail');
  };

  const navigateToAlbumDetail = (albumId: number) => {
    setSelectedAlbumId(albumId);
    setSelectedPlaylistId(null); // 다른 ID 초기화
    setSelectedArtistId(null);
    // Album 상세도 PlaylistDetailView를 재사용하거나 별도 컴포넌트 생성
    setCurrentView('playlistDetail'); // 예시로 playlistDetail 사용
  };

   const navigateToArtistDetail = (artistId: number) => {
      setSelectedArtistId(artistId);
      setSelectedPlaylistId(null); // 다른 ID 초기화
      setSelectedAlbumId(null);
     // Artist 상세 화면 필요 시 추가
     // setCurrentView('artistDetail');
     alert(`Artist ID ${artistId} 상세 화면 구현 필요`); // 임시 알림
   };


  const navigateToNowPlaying = () => {
    if(currentSong) { // 현재 재생 곡이 있을 때만 이동
        setCurrentView('nowPlaying');
    }
  };

  // --- 챗봇 추천 결과 처리 ---
  const handleRecommendationResult = (recommendedSongs: Song[]) => {
    if (recommendedSongs.length > 0) {
      setPlayerSongs(recommendedSongs); // 재생 목록 교체
      setCurrentSongIndex(0); // 첫 곡부터 시작
      setIsPlaying(false); // 일단 정지 상태로
      navigateToLibrary(); // 추천 후 라이브러리 화면으로 이동 (선택적)
      alert(`${recommendedSongs.length}개의 추천 곡을 재생 목록에 로드했습니다.`);
    } else {
      alert("추천된 곡 중 앱의 DB에서 찾을 수 있는 곡이 없습니다.");
    }
  };

  // --- 오디오 요소 이벤트 핸들러 ---
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleAudioPlay = () => setIsPlaying(true);
      const handleAudioPause = () => setIsPlaying(false);
      const handleAudioEnded = () => handleNext(); // 곡 종료 시 다음 곡 재생

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
  }, [handleNext]); // handleNext가 변경될 때마다 리스너 재등록

   // 현재 곡 변경 시 오디오 소스 업데이트 및 재생
   useEffect(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.src = currentSong.filePath;
      audioRef.current.load(); // 새 소스 로드
      if (isPlaying) {
        // isPlaying이 true일 때만 재생 시도
        audioRef.current.play().catch(e => {
            console.error("곡 변경 후 자동 재생 실패:", e);
            // 자동 재생 실패 시 isPlaying 상태를 false로 변경할 수 있음
             setIsPlaying(false);
        });
      }
    } else if (audioRef.current) {
         // 재생 목록이 비었을 때
         audioRef.current.pause();
         audioRef.current.removeAttribute('src');
         audioRef.current.load();
         setIsPlaying(false);
         setCurrentSongIndex(0); // 인덱스 초기화
     }
  }, [currentSong]); // currentSong 객체가 바뀔 때 실행

  return (
    <div className={`App ${currentView === 'nowPlaying' ? 'now-playing-active' : ''}`}>
      {/* 오디오 요소 (UI 없이 재생 로직만 처리) */}
       <audio ref={audioRef} />

      {isLoading ? (
        <div className="loading-state">앱 로딩 중...</div>
      ) : (
        <>
          {/* ----- 화면 전환 렌더링 ----- */}
          <div className="main-view">
             {currentView === 'library' && (
               <LibraryView
                 playlists={allPlaylists}
                 albums={allAlbums}
                 artists={allArtists}
                 songs={allSongs}
                 // 🚨 추천 곡 목록(featuredSongs)을 LibraryView로 전달
                 featuredSongs={featuredSongs}
                 onPlaylistClick={navigateToPlaylistDetail}
                 onAlbumClick={navigateToAlbumDetail}
                 onArtistClick={navigateToArtistDetail}
                 // 🚨 추천 곡 클릭 시 재생 처리 추가
                 onSongClick={(index, sourceList) => playSongAtIndex(index, sourceList === 'featured' ? featuredSongs : allSongs)}
                 refreshPlaylists={refreshPlaylists}
               />
             )}
            {currentView === 'playlistDetail' && (selectedPlaylistId || selectedAlbumId) && (
              <PlaylistDetailView
                playlistId={selectedPlaylistId}
                albumId={selectedAlbumId} // 앨범 ID 전달
                onSongClick={playSongAtIndex} // 상세 목록에서 재생
                onBackClick={navigateToLibrary}
                currentSongId={currentSong?.songId} // 현재 재생 곡 ID 전달
                isPlaying={isPlaying} // 재생 상태 전달
              />
            )}
            {currentView === 'nowPlaying' && currentSong && (
              <NowPlayingView
                song={currentSong}
                isPlaying={isPlaying}
                audioRef={audioRef} // 오디오 요소 직접 전달
                onPlayPause={handlePlayPause}
                onNext={handleNext}
                onPrev={handlePrev}
                onBackClick={() => setCurrentView('library')} // 이전 뷰 상태 관리 필요
              />
            )}
          </div>

          {/* ----- 하단 미니 플레이어 ----- */}
          {/* NowPlaying 화면이 아닐 때만 미니 플레이어 표시 */}
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

      {/* ----- AI 챗봇 ----- */}
      <Chatbot onRecommendationResult={handleRecommendationResult} />
    </div>
  );
}

export default App;