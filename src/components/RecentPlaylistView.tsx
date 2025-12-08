import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { Song } from '../types';
import { PlayIcon, ShuffleIcon } from './Icons';

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
          // albumId와 artistId가 유효한지 확인하고 매핑
          const album = song.albumId ? allAlbums.find(a => a && a.albumId === song.albumId) : null;
          const artist = song.artistId ? allArtists.find(a => a && a.artistId === song.artistId) : null;
          
          // 디버깅을 위한 로그 (개발 환경에서만)
          if (process.env.NODE_ENV === 'development' && !artist && song.artistId) {
            console.warn(`Artist not found for song ${song.songId}, artistId: ${song.artistId}`, {
              availableArtists: allArtists.map(a => ({ id: a.artistId, name: a.name })),
              songTitle: song.title
            });
          }
          
          // 이미 artistName이나 albumCoverUrl이 있으면 사용, 없으면 매핑
          return {
            ...song,
            albumCoverUrl: song.albumCoverUrl || album?.coverUrl || '/logo192.png',
            artistName: song.artistName || artist?.name || (song.artistId ? `Artist ID ${song.artistId}` : 'Unknown Artist')
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

    // allAlbums와 allArtists가 로드된 후에만 실행
    if (userId && allAlbums.length > 0 && allArtists.length > 0) {
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
      <div className="p-8 text-gray-200 bg-gradient-to-b from-dark-card to-dark-bg min-h-full flex flex-col items-center justify-center">
        <button 
          onClick={onBackClick} 
          className="absolute top-8 left-8 bg-transparent border-none text-gray-400 text-3xl cursor-pointer transition-colors hover:text-white"
        >
          ←
        </button>
        <p className="text-gray-400">최근 재생 기록 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-gray-200 bg-gradient-to-b from-dark-card to-dark-bg min-h-full flex flex-col items-center justify-center">
        <button 
          onClick={onBackClick} 
          className="absolute top-8 left-8 bg-transparent border-none text-gray-400 text-3xl cursor-pointer transition-colors hover:text-white"
        >
          ←
        </button>
        <p className="text-gray-400">{error}</p>
        <button 
          onClick={onBackClick}
          className="mt-4 px-4 py-2 bg-gray-600 text-white border-none rounded cursor-pointer hover:bg-gray-500"
        >
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 text-gray-200 bg-gradient-to-b from-dark-card to-dark-bg min-h-full">
      <div className="flex items-end gap-8 mb-8 relative">
        <button 
          onClick={onBackClick} 
          className="absolute -top-5 -left-2.5 bg-transparent border-none text-gray-400 text-3xl cursor-pointer transition-colors hover:text-white"
        >
          ←
        </button>
        <div className="flex flex-col">
          <h2 className="text-5xl font-extrabold m-0 mb-4 text-white">최근에 들은 곡</h2>
          <p className="text-base text-gray-300">{songs.length}곡</p>
        </div>
        <div className="flex items-center gap-4 mt-4 ml-auto">
          <button 
            onClick={handlePlayAll} 
            className="px-8 py-3.5 bg-gradient-to-r from-spotify-green to-green-500 text-white border-none rounded-full font-bold text-base cursor-pointer transition-all duration-300 hover:from-spotify-green-hover hover:to-green-400 hover:scale-105 hover:shadow-xl hover:shadow-spotify-green/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group flex items-center gap-2"
            disabled={songs.length === 0}
          >
            <span className="relative z-10 flex items-center gap-2.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span>Play</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </button>
          <button 
            onClick={handleShufflePlay} 
            className="px-8 py-3.5 bg-gray-800/60 hover:bg-gray-700/80 text-white border border-gray-700/50 rounded-full font-bold text-base cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-gray-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm flex items-center gap-2"
            disabled={songs.length === 0}
          >
            <ShuffleIcon className="w-5 h-5" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      <ul className="list-none p-0 m-0">
        {songs.length > 0 ? (
          songs.map((song, index) => {
            const isActive = currentSongId === song.songId;
            const isPlayingNow = isActive && isPlaying;

            return (
              <li
                key={`recent-song-${song.songId}-${index}`}
                className={`flex items-center px-4 py-3 rounded transition-colors hover:bg-white/10 border-b border-white/5 ${
                  isActive ? 'bg-white/5' : ''
                }`}
              >
                <div 
                  className="flex items-center flex-grow cursor-pointer" 
                  onClick={() => onSongClick(index, songs)}
                >
                  <div className="text-gray-400 w-8 text-center mr-4">
                    {isPlayingNow ? (
                      <span className="text-spotify-green">▶</span>
                    ) : isActive ? (
                      <span>⏸️</span>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <img
                    src={song.albumCoverUrl || '/logo192.png'}
                    alt="커버"
                    className="w-10 h-10 rounded mr-4 object-cover"
                  />
                  <div className="flex flex-col flex-grow">
                    <p className={`font-medium text-base m-0 ${isActive ? 'text-spotify-green' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="text-sm text-gray-400 m-0">{song.artistName}</p>
                  </div>
                </div>
                <span className="text-gray-400">{formatTime(song.durationSeconds)}</span>
              </li>
            );
          })
        ) : (
          <li className="text-gray-400 text-center py-8">최근에 들은 곡이 없습니다.</li>
        )}
      </ul>
    </div>
  );
};

export default RecentPlaylistView;

