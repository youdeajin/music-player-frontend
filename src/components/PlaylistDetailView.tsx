import React, { useState, useEffect } from 'react';
// 🚨 [수정] 설정된 axios 인스턴스 사용 (주소 자동 적용)
import axios from '../axiosConfig';
import { Song, PlaylistDetail, Album, Artist } from '../types';
import './PlaylistDetailView.css';

interface PlaylistDetailViewProps {
  playlistId: number | null;
  albumId: number | null;
  onSongClick: (index: number, songs: Song[]) => void;
  onBackClick: () => void;
  currentSongId?: number;
  isPlaying: boolean;
  loadAlbumSongsToPlayer: (albumId: number, albumTitle: string) => Promise<void>;
  allAlbums: Album[];
  allArtists: Artist[];
  onDeletePlaylist: (playlistId: number, playlistTitle: string) => Promise<void>;
}

type DetailItem = (PlaylistDetail) | (Album & { songs: Song[], artistName?: string });

const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlistId,
  albumId,
  onSongClick,
  onBackClick,
  currentSongId,
  isPlaying,
  loadAlbumSongsToPlayer,
  allAlbums,
  allArtists,
  onDeletePlaylist
}) => {
  const [details, setDetails] = useState<DetailItem | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  useEffect(() => {
    setIsOptionsOpen(false);

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      setDetails(null);
      setSongs([]);
      
      try {
        if (playlistId) {
          // 🚨 [수정] axiosConfig 사용 (주소 단축)
          const response = await axios.get<PlaylistDetail>(`/api/playlists/${playlistId}`);
          const playlistData = response.data;
          
          const processedSongs = (playlistData.songs || []).map(song => {
              const album = allAlbums.find(a => a.albumId === song.albumId);
              const artist = allArtists.find(a => a.artistId === song.artistId);
              return {
                  ...song,
                  albumCoverUrl: album?.coverUrl || '/logo192.png',
                  artistName: artist?.name || `ID ${song.artistId}`
              };
          });
          
          setDetails({ ...playlistData, songs: processedSongs });
          setSongs(processedSongs);
          
        } else if (albumId) {
          // 🚨 [수정] axiosConfig 사용 (주소 단축)
          const [albumRes, songsRes] = await Promise.all([
            axios.get<Album>(`/api/albums/${albumId}`), 
            axios.get<Song[]>(`/api/albums/${albumId}/songs`)
          ]);
          
          const loadedSongs = songsRes.data || [];
          const albumArtist = allArtists.find(a => a.artistId === albumRes.data.artistId);
          
           const processedSongs = loadedSongs.map(song => {
              const artist = allArtists.find(a => a.artistId === song.artistId);
              return {
                  ...song,
                  albumCoverUrl: albumRes.data.coverUrl || '/logo192.png', 
                  artistName: artist?.name || `ID ${song.artistId}`
              };
          });

          setDetails({ 
            ...albumRes.data, 
            artistName: albumArtist?.name,
            songs: processedSongs 
          });
          setSongs(processedSongs);
        }
      } catch (err: any) {
        console.error("데이터 로딩 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [playlistId, albumId, allAlbums, allArtists]);

  const getArtistName = (artistId: number): string => {
    const artist = allArtists.find(a => a.artistId === artistId);
    return artist ? artist.name : `아티스트 ID ${artistId}`;
  };

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

  const handleRemoveSong = async (songToRemove: Song) => {
    if (!playlistId || !details) {
        alert("앨범에서는 곡을 삭제할 수 없습니다.");
        return;
    }
    
    if (window.confirm(`'${details.title}' 재생목록에서 '${songToRemove.title}'을(를) 삭제하시겠습니까?`)) {
        try {
            // 🚨 [수정] axiosConfig 사용
            await axios.delete(`/api/playlists/${playlistId}/songs/${songToRemove.songId}`);
            const updatedSongs = songs.filter(s => s.songId !== songToRemove.songId);
            setSongs(updatedSongs);
            setDetails({ ...details, songs: updatedSongs });
        } catch (error) {
            console.error("재생목록 곡 삭제 실패:", error);
            alert("곡 삭제 중 오류가 발생했습니다.");
        }
    }
  };
  
  const handleDeleteThisPlaylist = () => {
    if (playlistId && details) {
        onDeletePlaylist(playlistId, details.title);
        setIsOptionsOpen(false);
    }
  };

  if (isLoading || !details) {
    return (
      <div className="playlist-detail-container loading-state">
        <button onClick={onBackClick} className="back-button">←</button>
        <p>{isLoading ? "데이터 로딩 중..." : (error ? error : "정보를 찾을 수 없습니다.")}</p>
        {error && <button onClick={onBackClick}>뒤로가기</button>}
      </div>
    );
  }

  const title = details.title;
  const coverUrl = details.coverUrl || '/logo192.png';
  const isPlaylist = 'createdAt' in details; 

  const subTitle = isPlaylist
      ? `${songs.length}곡 · 생성일 ${new Date(details.createdAt || Date.now()).toLocaleDateString()}`
      : getArtistName(details.artistId);

  return (
    <div className="playlist-detail-container">
      <div className="playlist-detail-header">
         <button onClick={onBackClick} className="back-button">←</button>
         <img src={coverUrl} alt={title} className="playlist-detail-cover" />
         <div className="playlist-detail-info">
            <h2 className="playlist-detail-title">{title}</h2>
            <p className="playlist-detail-description">{subTitle}</p>
         </div>
         <div className="playlist-detail-actions">
           <button onClick={handlePlayAll} className="play-button" disabled={songs.length === 0}>▶ Play</button>
           <button onClick={handleShufflePlay} className="shuffle-button" disabled={songs.length === 0}>🔀 Shuffle</button>
           
           {isPlaylist && (
             <div className="options-menu-container">
               <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="options-button">⋮</button>
               {isOptionsOpen && (
                 <div className="playlist-options-menu">
                   <button onClick={handleDeleteThisPlaylist} className="options-menu-item delete">
                     재생목록 삭제
                   </button>
                 </div>
               )}
             </div>
           )}
         </div>
       </div>

       <ul className="playlist-detail-songs">
         {songs.length > 0 ? (
           songs.map((song, index) => {
             const isActive = (currentSongId === song.songId);
             const isPlayingNow = isActive && isPlaying;
             
             return (
               <li
                 key={`detail-song-${song.songId}-${index}`}
                 className={`song-item ${isActive ? 'active' : ''}`}
               >
                 <div className="song-item-clickable-area" onClick={() => onSongClick(index, songs)}>
                   <div className="song-index">
                     {isPlayingNow ? <span className="playing-indicator">▶</span> : 
                      isActive ? <span className="paused-indicator">⏸️</span> : 
                      <span>{index + 1}</span>}
                   </div>
                   <img src={song.albumCoverUrl || '/logo192.png'} alt="커버" className="song-item-cover-small" />
                   <div className="song-item-info">
                     <p className="song-item-title">{song.title}</p>
                     <p className="song-item-subtitle">{song.artistName}</p>
                   </div>
                 </div>
                 
                 <span className="song-item-duration">{formatTime(song.durationSeconds)}</span>
                 
                 {isPlaylist && (
                    <button 
                      onClick={() => handleRemoveSong(song)} 
                      className="song-item-delete-btn"
                      title="재생목록에서 삭제"
                    >
                      ✕
                    </button>
                 )}
               </li>
             );
           })
         ) : (
           <li className="no-songs">이 목록에 곡이 없습니다.</li>
         )}
       </ul>

       {isOptionsOpen && (
          <div className="modal-click-outside" onClick={() => setIsOptionsOpen(false)}></div>
       )}
     </div>
   );
};

export default PlaylistDetailView;