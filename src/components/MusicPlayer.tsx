import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- 타입 정의 ---
// App.tsx와 공유하는 데이터 타입을 정의합니다. (src/types.ts 파일 필요)
interface Song {
  songId: number;
  title: string;
  artistId: number;
  albumId: number;
  filePath: string; // 음악 파일 경로 또는 URL
  durationSeconds: number; // 곡 길이 (초)
  genre: string;
  albumCoverUrl?: string; // 앨범 커버 URL (선택적)
  artistName?: string; // 아티스트 이름 (선택적)
}

interface Playlist {
  playlistId: number;
  title: string;
  ownerUserId: number; // 현재 앱에서는 사용하지 않음
  isPublic: number; // 0 또는 1
  createdAt: string; // ISO 8601 형식의 날짜 문자열
  coverUrl?: string; // 플레이리스트 커버 URL (선택적)
}

// 재생목록 상세 정보 (곡 목록 포함)
interface PlaylistDetail extends Playlist {
  songs: Song[];
}

interface Artist {
  artistId: number;
  name: string;
  imageUrl?: string; // 아티스트 이미지 URL (선택적)
}

interface Album {
  albumId: number;
  title: string;
  artistId: number;
  releaseDate: string; // YYYY-MM-DD 형식의 날짜 문자열
  coverUrl?: string; // 앨범 커버 URL 필드 (선택적)
  artistName?: string; // Album 타입에 artistName 추가 (선택적)
}

// --- Props 타입 정의 ---
// App 컴포넌트로부터 받을 데이터와 함수 타입을 정의합니다.
interface MusicPlayerProps {
    songs: Song[]; // 현재 플레이어에 로드된 곡 목록 (App에서 관리)
    setSongs: React.Dispatch<React.SetStateAction<Song[]>>; // App의 곡 목록 상태를 업데이트하는 함수
}

// --- 시간 포맷 유틸리티 함수 ---
// 초 단위 숫자를 "MM:SS" 형식의 문자열로 변환합니다.
const formatTime = (seconds: number): string => {
  // 유효하지 않은 값이면 "00:00" 반환
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60); // 분 계산
  const remainingSeconds = Math.floor(seconds % 60); // 초 계산
  // 두 자리 숫자로 포맷팅 (예: 5 -> "05")
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};


// --- MusicPlayer 컴포넌트 ---
// App 컴포넌트로부터 songs와 setSongs를 props로 받습니다.
const MusicPlayer: React.FC<MusicPlayerProps> = ({ songs, setSongs }) => {
  // --- 상태 변수 정의 ---
  // songs 상태는 App 컴포넌트로부터 props로 받습니다.

  const [currentSongIndex, setCurrentSongIndex] = useState(0); // 현재 재생 중인 곡의 인덱스
  const [isPlaying, setIsPlaying] = useState(false); // 재생 상태
  const audioRef = useRef<HTMLAudioElement>(null); // <audio> 요소 참조
  const [playlists, setPlaylists] = useState<Playlist[]>([]); // 저장된 재생목록 목록
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>(""); // 새 재생목록 제목 입력값
  const [currentArtistName, setCurrentArtistName] = useState<string | null>(null); // 현재 곡 아티스트 이름
  const [currentAlbumTitle, setCurrentAlbumTitle] = useState<string | null>(null); // 현재 곡 앨범 제목
  const [currentAlbumCoverUrl, setCurrentAlbumCoverUrl] = useState<string | null>(null); // 현재 곡 앨범 커버 URL
  const [currentTime, setCurrentTime] = useState(0); // 현재 재생 시간 (초)
  const [duration, setDuration] = useState(0); // 전체 곡 길이 (초)
  const [isSeeking, setIsSeeking] = useState(false); // 사용자가 탐색 바를 조작 중인지 여부

  // 현재 선택된 곡 객체
  const currentSong = songs[currentSongIndex];

  // --- useEffect 훅 ---

  // 1. 컴포넌트 마운트 시 저장된 재생목록 목록 로드
  useEffect(() => {
    const fetchPlaylists = async () => {
        try {
            // 백엔드 API 호출하여 모든 재생목록 가져오기 (HTTPS 사용)
            const playlistsResponse = await axios.get('http://localhost:8080/api/playlists');
            // 응답 데이터가 배열인지 확인하고 상태 업데이트
            setPlaylists(Array.isArray(playlistsResponse.data) ? playlistsResponse.data : []);
        } catch (error) {
            console.error("저장된 재생목록 로딩 실패:", error);
            setPlaylists([]); // 에러 시 빈 배열로 초기화
        }
    };
    fetchPlaylists();
  }, []); // 빈 의존성 배열: 컴포넌트가 처음 렌더링될 때 한 번만 실행

  // 2. 현재 곡 변경 시 오디오 업데이트 및 아티스트/앨범/커버 정보 로드
  useEffect(() => {
    if (currentSong) {
      // 오디오 요소 업데이트
      if (audioRef.current) {
        audioRef.current.load(); // 새 곡 로드
        setDuration(0); // 새 곡 로드 시 duration 초기화
        setCurrentTime(0); // 새 곡 로드 시 현재 시간 초기화
        if (isPlaying) {
          audioRef.current.play().catch(error => {
            console.log("자동 재생 시도 실패:", error.message);
            setIsPlaying(false);
          });
        } else {
             audioRef.current.pause();
        }
      }

      // 아티스트, 앨범, 커버 상세 정보 비동기 로드 함수
      const fetchDetails = async () => {
        setCurrentArtistName(null); // 이전 정보 초기화
        setCurrentAlbumTitle(null);
        setCurrentAlbumCoverUrl(null);

        // 아티스트 정보 로드
        if (currentSong.artistId) {
          try {
            const artistRes = await axios.get<Artist>(`http://localhost:8080/api/artists/${currentSong.artistId}`);
            setCurrentArtistName(artistRes.data.name);
          } catch (error) { setCurrentArtistName("정보 없음"); }
        }

        // 앨범 정보 및 커버 URL 로드
        if (currentSong.albumId) {
          try {
            const albumRes = await axios.get<Album>(`http://localhost:8080/api/albums/${currentSong.albumId}`);
            setCurrentAlbumTitle(albumRes.data.title);
            // 앨범 응답에 coverUrl이 있으면 상태 업데이트
            if (albumRes.data.coverUrl) {
                setCurrentAlbumCoverUrl(albumRes.data.coverUrl);
            }
          } catch (error) {
            console.error(`앨범 정보 로딩 실패 (ID: ${currentSong.albumId}):`, error);
            setCurrentAlbumTitle("정보 없음");
            setCurrentAlbumCoverUrl(null); // 오류 시 null
          }
        } else {
            // 앨범 ID가 없는 경우 (예: 싱글) 커버 URL도 null로 설정
            setCurrentAlbumCoverUrl(null);
        }
      };
      fetchDetails(); // 상세 정보 로드 함수 실행

    } else { // 현재 재생할 곡이 없을 때 (songs 배열이 비었을 때)
      if (audioRef.current) {
        audioRef.current.pause(); // 오디오 정지
        audioRef.current.removeAttribute('src'); // src 속성 제거 (선택적)
        audioRef.current.load(); // 빈 상태 로드
      }
      setIsPlaying(false);
      setCurrentArtistName(null);
      setCurrentAlbumTitle(null);
      setCurrentAlbumCoverUrl(null); // 커버 URL 초기화
      setCurrentSongIndex(0);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSongIndex, songs]); // currentSongIndex나 songs 배열이 바뀔 때 실행


  // --- 이벤트 핸들러 함수 ---

  // 재생/일시정지 버튼
  const handlePlayPause = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("재생 시작 실패:", e));
    }
  };

  // 다음 곡 버튼
  const handleNext = () => {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true); // 다음 곡 재생 시도
  };

  // 이전 곡 버튼
  const handlePrev = () => {
    if (songs.length === 0) return;
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true); // 이전 곡 재생 시도
  };

  // 저장된 재생목록 클릭 시 곡 목록 로드
  const loadPlaylistSongs = async (playlistId: number) => {
    try {
      const response = await axios.get<PlaylistDetail>(`http://localhost:8080/api/playlists/${playlistId}`);
      if (response.data && Array.isArray(response.data.songs)) {
        setSongs(response.data.songs.length > 0 ? response.data.songs : []); // App 상태 업데이트
        setCurrentSongIndex(0);
        setIsPlaying(false);
        console.log(`Playlist ${playlistId} 로드 완료.`);
      } else {
         setSongs([]);
         setCurrentSongIndex(0);
         setIsPlaying(false);
         console.log(`Playlist ${playlistId}는 비어 있거나 데이터를 찾을 수 없습니다.`);
      }
    } catch (error) {
      console.error(`Playlist ${playlistId} 로딩 실패:`, error);
      setSongs([]);
      setCurrentSongIndex(0);
      setIsPlaying(false);
    }
  };

  // 새 재생목록 생성
  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) { alert("재생목록 제목을 입력하세요."); return; }
    // 현재 플레이어 목록(songs) 기준으로 생성
    if (songs.length === 0) { alert("현재 재생 목록에 곡이 없습니다."); return; }

    const currentSongIds = songs.map(song => song.songId);

    try {
      const response = await axios.post('http://localhost:8080/api/playlists', {
        title: newPlaylistTitle, isPublic: true, songIds: currentSongIds
      });
      if (response.status === 201) {
        alert(`재생목록 '${newPlaylistTitle}' 생성 완료!`);
        setNewPlaylistTitle(""); // 입력 필드 초기화
        // 저장된 재생목록 목록 새로고침
        const playlistsResponse = await axios.get('http://localhost:8080/api/playlists');
        setPlaylists(Array.isArray(playlistsResponse.data) ? playlistsResponse.data : []);
      }
    } catch (error) {
      console.error("재생목록 생성 실패:", error);
      alert("재생목록 생성 중 오류가 발생했습니다.");
    }
  };

  // 저장된 재생목록 삭제
  const handleDeletePlaylist = async (playlistId: number, playlistTitle: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`정말로 재생목록 '${playlistTitle}'을(를) 삭제하시겠습니까?`)) {
      try {
        const response = await axios.delete(`http://localhost:8080/api/playlists/${playlistId}`);
        if (response.status === 204) { // No Content
          alert(`재생목록 '${playlistTitle}' 삭제 완료!`);
          // 저장된 재생목록 목록 새로고침
          const playlistsResponse = await axios.get('http://localhost:8080/api/playlists');
          setPlaylists(Array.isArray(playlistsResponse.data) ? playlistsResponse.data : []);
        }
      } catch (error) {
        console.error("재생목록 삭제 실패:", error);
        alert("재생목록 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // 오디오 메타데이터 로드 완료 시 duration 설정
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      // duration이 유효한 숫자인지 확인 후 설정
      const durationValue = audioRef.current.duration;
      setDuration(isNaN(durationValue) ? 0 : durationValue);
    }
  };

  // 오디오 시간 업데이트 시 currentTime 설정
  const handleTimeUpdate = () => {
    // 사용자가 탐색 바를 조작 중이 아닐 때만 업데이트
    if (!isSeeking && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // 사용자가 탐색 바 값을 변경할 때 오디오 시간 업데이트
  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(event.target.value);
      audioRef.current.currentTime = newTime; // 오디오 시간 변경
      setCurrentTime(newTime); // 슬라이더 위치 즉시 반영
    }
  };

  // 사용자가 탐색 바를 누르기 시작할 때 (드래그 시작)
  const handleSeekMouseDown = () => {
    setIsSeeking(true); // 조작 중 플래그 활성화
  };

  // 사용자가 탐색 바에서 손을 뗄 때 (드래그 종료)
  const handleSeekMouseUp = () => {
    setIsSeeking(false); // 조작 중 플래그 비활성화
    // 선택 사항: 드래그 종료 후 재생 상태였다면 다시 재생
    // if (isPlaying && audioRef.current) {
    //   audioRef.current.play().catch(e => console.error("Seek 후 재생 실패:", e));
    // }
  };


  // --- 렌더링 로직 ---

  // 데이터 로딩 중 표시 (선택적)
  // if (playlists.length === 0 && songs.length === 0) { ... }

  return (
    // 기본 CSS 클래스 적용
    <div className="player-container">
      <div className="player-card">

        {/* 앨범 커버 이미지 표시 */}
        <div className="album-cover-container">
          {currentAlbumCoverUrl ? (
            <img src={currentAlbumCoverUrl} alt={currentAlbumTitle || '앨범 커버'} className="album-cover-image" />
          ) : (
            <div className="album-cover-placeholder"> {/* 커버 없을 때 기본 아이콘 */}
              <span>🎵</span>
            </div>
          )}
        </div>

        {/* 현재 재생 곡 정보 */}
        <div className="song-info">
          <h2>{currentSong ? currentSong.title : "재생 준비 중..."}</h2>
          <p>
            아티스트: {currentArtistName ?? (currentSong ? `ID ${currentSong.artistId}` : "-")} |
            앨범: {currentAlbumTitle ?? (currentSong ? `ID ${currentSong.albumId}` : "-")} |
            장르: {currentSong ? currentSong.genre : "-"}
          </p>
        </div>

        {/* HTML5 오디오 요소 (controls 제거됨) */}
        <audio
          ref={audioRef}
          src={currentSong?.filePath}
          onPlay={() => setIsPlaying(true)} // 오디오 자체 이벤트로 상태 업데이트
          onPause={() => setIsPlaying(false)}
          onEnded={handleNext} // 곡 끝나면 다음 곡
          onLoadedMetadata={handleLoadedMetadata} // 메타데이터 로드 시 duration 설정
          onTimeUpdate={handleTimeUpdate}       // 시간 업데이트 시 currentTime 설정
        />

        {/* 탐색 바 UI */}
        <div className="seek-bar-container">
          <span className="time-display">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            // duration이 유효하지 않으면 max를 0으로 설정
            max={duration && !isNaN(duration) ? duration : 0}
            value={currentTime}
            onChange={handleSeekChange}    // 슬라이더 값 변경 시 오디오 시간 변경
            onMouseDown={handleSeekMouseDown} // 드래그 시작 감지
            onMouseUp={handleSeekMouseUp}     // 드래그 종료 감지
            className="seek-bar"
            // 곡이 없거나 duration이 0이면 비활성화
            disabled={!currentSong || !duration || duration === 0}
          />
          <span className="time-display">{formatTime(duration)}</span>
        </div>

        {/* 재생 컨트롤 버튼 */}
        <div className="controls">
          <button onClick={handlePrev} title="이전 곡" disabled={songs.length === 0}>⏮️</button>
          <button onClick={handlePlayPause} title={isPlaying ? "일시정지" : "재생"} disabled={!currentSong}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button onClick={handleNext} title="다음 곡" disabled={songs.length === 0}>⏭️</button>
        </div>

        {/* 현재 재생 목록 */}
        {songs.length > 0 ? (
            <div className="playlist-section">
                <h4>현재 재생 목록 ({songs.length} 곡)</h4>
                <ul>
                    {songs.map((song, index) => (
                        <li
                            key={`current-${song.songId}-${index}`} // 고유 키
                            onClick={() => setCurrentSongIndex(index)} // 클릭 시 해당 곡 선택
                            className={index === currentSongIndex ? 'active-song' : ''} // 현재 곡 스타일
                        >
                            {index + 1}. {song.title}
                            <span className="song-duration">({song.durationSeconds}s)</span>
                        </li>
                    ))}
                </ul>
            </div>
        ) : (
             <div className="playlist-section empty-playlist">
                 <h4>현재 재생 목록</h4>
                 <p>곡이 없습니다.</p>
            </div>
        )}

        {/* 새 재생목록 생성 폼 */}
        <div className="create-playlist-section">
          <h4>새 재생목록 만들기 (현재 목록 기준)</h4>
          <input
            type="text"
            placeholder="새 재생목록 이름 입력"
            value={newPlaylistTitle}
            onChange={(e) => setNewPlaylistTitle(e.target.value)}
            className="playlist-input"
          />
          <button onClick={handleCreatePlaylist} className="create-btn">
            생성
          </button>
        </div>

        {/* 저장된 재생목록 목록 */}
        <div className="saved-playlists-section">
          <h4>저장된 재생목록 ({playlists.length} 개)</h4>
          {playlists.length > 0 ? (
            <ul>
              {playlists.map((playlist) => (
                <li
                  key={playlist.playlistId}
                  className="playlist-item"
                >
                  {/* 제목 클릭 시 해당 재생목록 로드 */}
                  <span onClick={() => loadPlaylistSongs(playlist.playlistId)} className="playlist-title">
                    {playlist.title}
                  </span>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // li 클릭 이벤트 방지
                      handleDeletePlaylist(playlist.playlistId, playlist.title);
                    }}
                    className="delete-btn"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-playlists">저장된 재생목록이 없습니다.</p>
          )}
        </div>

      </div> {/* player-card 끝 */}
    </div> // player-container 끝
  );
};

export default MusicPlayer; // 컴포넌트 내보내기

