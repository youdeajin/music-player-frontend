// src/components/PlaylistDetailView.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlaylistDetail, Album, Song } from '../types';

interface PlaylistDetailViewProps {
  playlistId?: number | null; // 플레이리스트 ID 또는
  albumId?: number | null;    // 앨범 ID
  onSongClick: (index: number, songs: Song[]) => void; // 재생할 곡의 인덱스와 목록 전달
  onBackClick: () => void;
  currentSongId?: number | null; // 현재 재생 중인 곡 ID (스타일링용)
  isPlaying?: boolean; // 재생 상태 (스타일링용)
}

const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlistId,
  albumId,
  onSongClick,
  onBackClick,
  currentSongId,
  isPlaying
}) => {
  const [details, setDetails] = useState<PlaylistDetail | Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let response;
        if (playlistId) {
          response = await axios.get<PlaylistDetail>(`https://localhost:8443/api/playlists/${playlistId}`);
           setDetails(response.data);
           // 플레이리스트 API 응답에 songs 배열이 포함되어 있다고 가정
           setSongs(response.data.songs || []);
        } else if (albumId) {
          response = await axios.get<Album>(`https://localhost:8443/api/albums/${albumId}`); // 앨범 상세 API
          const albumData = response.data;
           setDetails(albumData);
           // 앨범 상세 API 호출 후, 해당 앨범의 곡 목록을 별도로 조회해야 할 수 있음
           const songsResponse = await axios.get<Song[]>(`https://localhost:8443/api/albums/${albumId}/songs`); // 앨범 곡 목록 API 가정
           setSongs(songsResponse.data || []);
        } else {
          throw new Error("플레이리스트 또는 앨범 ID가 필요합니다.");
        }

      } catch (err) {
        console.error("데이터 로딩 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
        setDetails(null);
        setSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [playlistId, albumId]);

   // 시간 포맷 함수
   const formatTime = (seconds: number): string => {
       if (isNaN(seconds) || seconds < 0) return "0:00";
       const minutes = Math.floor(seconds / 60);
       const remainingSeconds = Math.floor(seconds % 60);
       return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
   };

    // 전체 재생 버튼 핸들러
    const handlePlayAll = () => {
        if (songs.length > 0) {
            onSongClick(0, songs); // 첫 번째 곡부터 재생 시작 (재생 목록 전달)
        }
    };

    // 셔플 재생 버튼 핸들러 (구현 필요)
    const handleShufflePlay = () => {
        if (songs.length > 0) {
            // 현재 곡 목록(songs)을 복사하고 랜덤하게 섞습니다.
            const shuffledSongs = [...songs].sort(() => Math.random() - 0.5);
            // 섞인 목록의 첫 곡부터 재생합니다.
            onSongClick(0, shuffledSongs);
             alert("셔플 재생 기능 구현 필요");
        }
    };


  if (isLoading) {
    return <div className="loading-state">로딩 중...</div>;
  }

  if (error) {
    return <div className="error-state">{error} <button onClick={onBackClick}>뒤로가기</button></div>;
  }

  if (!details) {
    return <div className="error-state">정보를 찾을 수 없습니다. <button onClick={onBackClick}>뒤로가기</button></div>;
  }

  const title = details.title;

    // 🚨 수정: description 대신 조건부로 다른 정보 표시
    // details가 PlaylistDetail 타입인지 확인 (예: createdAt 속성 존재 여부로 확인)
    const isPlaylistDetail = details && 'createdAt' in details;

    const subTitle = isPlaylistDetail
        ? `생성일: ${new Date((details as PlaylistDetail).createdAt || Date.now()).toLocaleDateString()}` // 생성일 표시
        // 앨범일 경우 아티스트 이름 표시 (Album 타입에 artistName이 있다고 가정)
        : (details as Album).artistName || '';

    const coverUrl = (details as PlaylistDetail).coverUrl || (details as Album).coverUrl || '/logo192.png';


  return (
    <div className="playlist-detail-container">
      <div className="playlist-detail-header">
         <button onClick={onBackClick} className="back-button">←</button>
        <img src={coverUrl} alt={title} className="playlist-detail-cover" />
        <h2 className="playlist-detail-title">{title}</h2>
        <p className="playlist-detail-description">{subTitle}</p>
        <div className="playlist-detail-actions">
          <button onClick={handlePlayAll} className="play-button">▶ Play</button>
          <button onClick={handleShufflePlay} className="shuffle-button">🔀 Shuffle</button>
          <button className="options-button">⋮</button> {/* 추가 옵션 버튼 */}
        </div>
      </div>
      <ul className="playlist-detail-songs">
        {songs.map((song, index) => (
          <li
            key={`detail-${song.songId}-${index}`}
            className={`song-item ${song.songId === currentSongId ? 'active' : ''}`}
            onClick={() => onSongClick(index, songs)} // 곡 클릭 시 재생 (현재 목록 전달)
          >
             <div className="song-item-info">
                 {/* 현재 재생 중인 곡 표시 */}
                 {song.songId === currentSongId && isPlaying && <span className="playing-indicator">▶</span>}
                 {song.songId === currentSongId && !isPlaying && <span className="paused-indicator">⏸</span>}
               <span className="song-index">{index + 1}</span>
               <div className="song-title-artist">
                 <p className="song-item-title">{song.title}</p>
                 <p className="song-item-subtitle">{song.artistName || `Artist ID ${song.artistId}`}</p>
               </div>
             </div>
             <span className="song-item-duration">{formatTime(song.durationSeconds)}</span>
          </li>
        ))}
        {songs.length === 0 && <li className="no-songs">이 목록에 곡이 없습니다.</li>}
      </ul>
    </div>
  );
};

export default PlaylistDetailView;