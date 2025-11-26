import React, { useState, useEffect, useRef } from 'react';
import axios from '../axiosConfig'; // 🚨 [수정]
import { Song, Playlist, PlaylistDetail, Artist, Album, User } from '../types';

interface MusicPlayerProps {
    songs: Song[];
    setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
    currentUser?: User; // 🚨 [추가]
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ songs, setSongs, currentUser }) => {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>("");
  const [currentArtistName, setCurrentArtistName] = useState<string | null>(null);
  const [currentAlbumTitle, setCurrentAlbumTitle] = useState<string | null>(null);
  const [currentAlbumCoverUrl, setCurrentAlbumCoverUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const currentSong = songs[currentSongIndex];

  useEffect(() => {
    const fetchPlaylists = async () => {
        try {
            const playlistsResponse = await axios.get('/api/playlists');
            setPlaylists(Array.isArray(playlistsResponse.data) ? playlistsResponse.data : []);
        } catch (error) {
            console.error("저장된 재생목록 로딩 실패:", error);
            setPlaylists([]);
        }
    };
    fetchPlaylists();
  }, []);

  useEffect(() => {
    if (currentSong) {
      if (audioRef.current) {
        audioRef.current.load();
        setDuration(0);
        setCurrentTime(0);
        if (isPlaying) {
          audioRef.current.play().catch(error => {
            console.log("자동 재생 시도 실패:", error.message);
            setIsPlaying(false);
          });
        } else {
             audioRef.current.pause();
        }
      }

      const fetchDetails = async () => {
        setCurrentArtistName(null);
        setCurrentAlbumTitle(null);
        setCurrentAlbumCoverUrl(null);

        if (currentSong.artistId) {
          try {
            const artistRes = await axios.get<Artist>(`/api/artists/${currentSong.artistId}`);
            setCurrentArtistName(artistRes.data.name);
          } catch (error) { setCurrentArtistName("정보 없음"); }
        }

        if (currentSong.albumId) {
          try {
            const albumRes = await axios.get<Album>(`/api/albums/${currentSong.albumId}`);
            setCurrentAlbumTitle(albumRes.data.title);
            if (albumRes.data.coverUrl) {
                setCurrentAlbumCoverUrl(albumRes.data.coverUrl);
            }
          } catch (error) {
            console.error(`앨범 정보 로딩 실패 (ID: ${currentSong.albumId}):`, error);
            setCurrentAlbumTitle("정보 없음");
            setCurrentAlbumCoverUrl(null);
          }
        } else {
            setCurrentAlbumCoverUrl(null);
        }
      };
      fetchDetails();

    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      setIsPlaying(false);
      setCurrentArtistName(null);
      setCurrentAlbumTitle(null);
      setCurrentAlbumCoverUrl(null);
      setCurrentSongIndex(0);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSongIndex, songs]);

  const handlePlayPause = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("재생 시작 실패:", e));
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (songs.length === 0) return;
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
  };

  const loadPlaylistSongs = async (playlistId: number) => {
    try {
      const response = await axios.get<PlaylistDetail>(`/api/playlists/${playlistId}`);
      if (response.data && Array.isArray(response.data.songs)) {
        setSongs(response.data.songs.length > 0 ? response.data.songs : []);
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

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) { alert("재생목록 제목을 입력하세요."); return; }
    if (songs.length === 0) { alert("현재 재생 목록에 곡이 없습니다."); return; }
    if (!currentUser) { alert("로그인이 필요합니다."); return; }

    const currentSongIds = songs.map(song => song.songId);

    try {
      // 🚨 [수정] userId 함께 전송
      const response = await axios.post('/api/playlists', {
        title: newPlaylistTitle, isPublic: true, songIds: currentSongIds, userId: currentUser.userId
      });
      if (response.status === 201) {
        alert(`재생목록 '${newPlaylistTitle}' 생성 완료!`);
        setNewPlaylistTitle("");
        const playlistsResponse = await axios.get('/api/playlists');
        setPlaylists(Array.isArray(playlistsResponse.data) ? playlistsResponse.data : []);
      }
    } catch (error) {
      console.error("재생목록 생성 실패:", error);
      alert("재생목록 생성 중 오류가 발생했습니다.");
    }
  };

  const handleDeletePlaylist = async (playlistId: number, playlistTitle: string) => {
    if (window.confirm(`정말로 재생목록 '${playlistTitle}'을(를) 삭제하시겠습니까?`)) {
      try {
        const response = await axios.delete(`/api/playlists/${playlistId}`);
        if (response.status === 204) {
          alert(`재생목록 '${playlistTitle}' 삭제 완료!`);
          const playlistsResponse = await axios.get('/api/playlists');
          setPlaylists(Array.isArray(playlistsResponse.data) ? playlistsResponse.data : []);
        }
      } catch (error) {
        console.error("재생목록 삭제 실패:", error);
        alert("재생목록 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const durationValue = audioRef.current.duration;
      setDuration(isNaN(durationValue) ? 0 : durationValue);
    }
  };

  const handleTimeUpdate = () => {
    if (!isSeeking && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(event.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
  };

  return (
    <div className="player-container">
      <div className="player-card">
        <div className="album-cover-container">
          {currentAlbumCoverUrl ? (
            <img src={currentAlbumCoverUrl} alt={currentAlbumTitle || '앨범 커버'} className="album-cover-image" />
          ) : (
            <div className="album-cover-placeholder">
              <span>🎵</span>
            </div>
          )}
        </div>

        <div className="song-info">
          <h2>{currentSong ? currentSong.title : "재생 준비 중..."}</h2>
          <p>
            아티스트: {currentArtistName ?? (currentSong ? `ID ${currentSong.artistId}` : "-")} |
            앨범: {currentAlbumTitle ?? (currentSong ? `ID ${currentSong.albumId}` : "-")} |
            장르: {currentSong ? currentSong.genre : "-"}
          </p>
        </div>

        <audio
          ref={audioRef}
          src={currentSong?.filePath}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleNext}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
        />

        <div className="seek-bar-container">
          <span className="time-display">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration && !isNaN(duration) ? duration : 0}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseDown={handleSeekMouseDown}
            onMouseUp={handleSeekMouseUp}
            className="seek-bar"
            disabled={!currentSong || !duration || duration === 0}
          />
          <span className="time-display">{formatTime(duration)}</span>
        </div>

        <div className="controls">
          <button onClick={handlePrev} title="이전 곡" disabled={songs.length === 0}>⏮️</button>
          <button onClick={handlePlayPause} title={isPlaying ? "일시정지" : "재생"} disabled={!currentSong}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button onClick={handleNext} title="다음 곡" disabled={songs.length === 0}>⏭️</button>
        </div>

        {songs.length > 0 ? (
            <div className="playlist-section">
                <h4>현재 재생 목록 ({songs.length} 곡)</h4>
                <ul>
                    {songs.map((song, index) => (
                        <li
                            key={`current-${song.songId}-${index}`}
                            onClick={() => setCurrentSongIndex(index)}
                            className={index === currentSongIndex ? 'active-song' : ''}
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

        <div className="saved-playlists-section">
          <h4>저장된 재생목록 ({playlists.length} 개)</h4>
          {playlists.length > 0 ? (
            <ul>
              {playlists.map((playlist) => (
                <li
                  key={playlist.playlistId}
                  className="playlist-item"
                >
                  <span onClick={() => loadPlaylistSongs(playlist.playlistId)} className="playlist-title">
                    {playlist.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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

      </div>
    </div>
  );
};

export default MusicPlayer;