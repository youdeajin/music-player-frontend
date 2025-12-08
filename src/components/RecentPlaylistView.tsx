import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { Song } from '../types';
import './PlaylistDetailView.css'; // 재사용 가능한 스타일

interface RecentPlaylistViewProps {
  userId: number;
  onSongClick: (index: number, songs: Song[]) => void;
  onBackClick: () => void;
  currentSongId?: number;
  isPlaying: boolean;
  allAlbums: any[];
  allArtists: any[];
}

const RecentPlaylistView: React.FC<RecentPlaylistViewProps> = ({
  userId,
  onSongClick,
  onBackClick,
  currentSongId,
  isPlaying,
  allAlbums,
  allArtists
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentSongs = async () => {
      setIsLoading(true);
      setError(null);
      setSongs([]);

      try {
        const response = await axios.get<Song[]>(`/api/play-history/user/${userId}`, {
          params: { limit: 50 }
        });

        // 응답 데이터가 없거나 빈 배열인 경우 처리
        const songsData = response.data || [];
        
        const processedSongs = songsData.map(song => {
          const album = allAlbums.find(a => a.albumId === song.albumId);
          const artist = allArtists.find(a => a.artistId === song.artistId);
          return {
            ...song,
            albumCoverUrl: album?.coverUrl || '/logo192.png',
            artistName: artist?.name || `ID ${song.artistId}`
          };
        });

        setSongs(processedSongs);
        
        // 데이터가 없을 때는 에러가 아니라 빈 목록으로 표시
        if (processedSongs.length === 0) {
          setError(null); // 에러 상태 초기화
        }
      } catch (err: any) {
        console.error("최근 재생 기록 로딩 실패:", err);
        
        // 404 에러는 데이터가 없는 것으로 처리 (에러 아님)
        if (err.response?.status === 404) {
          setSongs([]);
          setError(null);
        } else {
          setError("최근 재생 기록을 불러오는데 실패했습니다.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchRecentSongs();
    }
  }, [userId, allAlbums, allArtists]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      onSongClick(0, songs);
    }
  };

  const handleShufflePlay = () => {
    if (songs.length > 0) {
      const shuffledSongs = [...songs].sort(() => Math.random() - 0.5);
      onSongClick(0, shuffledSongs);
    }
  };

  if (isLoading) {
    return (
      <div className="playlist-detail-container loading-state">
        <button onClick={onBackClick} className="back-button">←</button>
        <p>최근 재생 기록 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playlist-detail-container loading-state">
        <button onClick={onBackClick} className="back-button">←</button>
        <p>{error}</p>
        <button onClick={onBackClick}>뒤로가기</button>
      </div>
    );
  }

  return (
    <div className="playlist-detail-container">
      <div className="playlist-detail-header">
        <button onClick={onBackClick} className="back-button">←</button>
        <div className="playlist-detail-info">
          <h2 className="playlist-detail-title">최근에 들은 곡</h2>
          <p className="playlist-detail-description">{songs.length}곡</p>
        </div>
        <div className="playlist-detail-actions">
          <button onClick={handlePlayAll} className="play-button" disabled={songs.length === 0}>
            ▶ Play
          </button>
          <button onClick={handleShufflePlay} className="shuffle-button" disabled={songs.length === 0}>
            🔀 Shuffle
          </button>
        </div>
      </div>

      <ul className="playlist-detail-songs">
        {songs.length > 0 ? (
          songs.map((song, index) => {
            const isActive = currentSongId === song.songId;
            const isPlayingNow = isActive && isPlaying;

            return (
              <li
                key={`recent-song-${song.songId}-${index}`}
                className={`song-item ${isActive ? 'active' : ''}`}
              >
                <div className="song-item-clickable-area" onClick={() => onSongClick(index, songs)}>
                  <div className="song-index">
                    {isPlayingNow ? (
                      <span className="playing-indicator">▶</span>
                    ) : isActive ? (
                      <span className="paused-indicator">⏸️</span>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <img
                    src={song.albumCoverUrl || '/logo192.png'}
                    alt="커버"
                    className="song-item-cover-small"
                  />
                  <div className="song-item-info">
                    <p className="song-item-title">{song.title}</p>
                    <p className="song-item-subtitle">{song.artistName}</p>
                  </div>
                </div>
                <span className="song-item-duration">{formatTime(song.durationSeconds)}</span>
              </li>
            );
          })
        ) : (
          <li className="no-songs">최근에 들은 곡이 없습니다.</li>
        )}
      </ul>
    </div>
  );
};

export default RecentPlaylistView;

