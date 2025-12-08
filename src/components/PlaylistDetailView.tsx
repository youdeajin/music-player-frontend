import React, { useState, useEffect } from 'react';
// 🚨 [수정] 설정된 axios 인스턴스 사용 (주소 자동 적용)
import axios from '../axiosConfig';
import { Song, PlaylistDetail, Album, Artist } from '../types';
import { PlayIcon, ShuffleIcon } from './Icons';

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
      <div className="p-8 text-gray-200 bg-gradient-to-b from-dark-card to-dark-bg min-h-full flex flex-col items-center justify-center">
        <button 
          onClick={onBackClick} 
          className="absolute top-8 left-8 bg-transparent border-none text-gray-400 text-3xl cursor-pointer transition-colors hover:text-white"
        >
          ←
        </button>
        <p className="text-gray-400">{isLoading ? "데이터 로딩 중..." : (error ? error : "정보를 찾을 수 없습니다.")}</p>
        {error && (
          <button 
            onClick={onBackClick}
            className="mt-4 px-4 py-2 bg-gray-600 text-white border-none rounded cursor-pointer hover:bg-gray-500"
          >
            뒤로가기
          </button>
        )}
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
    <div className="p-8 text-gray-200 bg-gradient-to-b from-dark-card to-dark-bg min-h-full">
      <div className="flex items-end gap-8 mb-8 relative">
         <button 
           onClick={onBackClick} 
           className="absolute -top-5 -left-2.5 bg-transparent border-none text-gray-400 text-3xl cursor-pointer transition-colors hover:text-white"
         >
           ←
         </button>
         <img 
           src={coverUrl} 
           alt={title} 
           className="w-48 h-48 object-cover rounded-lg shadow-xl" 
         />
         <div className="flex flex-col">
            <h2 className="text-5xl font-extrabold m-0 mb-4 text-white">{title}</h2>
            <p className="text-base text-gray-300">{subTitle}</p>
         </div>
         <div className="flex items-center gap-4 mt-4 ml-auto">
           <button 
             onClick={handlePlayAll} 
             className="px-8 py-3.5 bg-gradient-to-r from-spotify-green to-green-500 text-white border-none rounded-full font-bold text-base cursor-pointer transition-all duration-300 hover:from-spotify-green-hover hover:to-green-400 hover:scale-105 hover:shadow-xl hover:shadow-spotify-green/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group flex items-center gap-2"
             disabled={songs.length === 0}
           >
             <span className="relative z-10 flex items-center gap-2">
               <PlayIcon className="w-5 h-5" />
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
           
           {isPlaylist && (
             <div className="relative">
               <button 
                 onClick={() => setIsOptionsOpen(!isOptionsOpen)} 
                 className="bg-transparent border-none text-gray-400 text-2xl cursor-pointer hover:text-white transition-colors"
               >
                 ⋮
               </button>
               {isOptionsOpen && (
                 <div className="absolute top-full left-0 bg-dark-hover rounded mt-1 shadow-xl z-[100] min-w-[160px] overflow-hidden">
                   <button 
                     onClick={handleDeleteThisPlaylist} 
                     className="block w-full text-left px-4 py-3 bg-transparent border-none text-gray-200 cursor-pointer text-sm hover:bg-gray-600 text-red-400"
                   >
                     재생목록 삭제
                   </button>
                 </div>
               )}
             </div>
           )}
         </div>
       </div>

       <ul className="list-none p-0 m-0">
         {songs.length > 0 ? (
           songs.map((song, index) => {
             const isActive = (currentSongId === song.songId);
             const isPlayingNow = isActive && isPlaying;
             
             return (
               <li
                 key={`detail-song-${song.songId}-${index}`}
                 className={`flex items-center px-4 py-3 rounded transition-colors hover:bg-white/10 border-b border-white/5 ${
                   isActive ? 'bg-white/5' : ''
                 }`}
               >
                 <div 
                   className="flex items-center flex-grow cursor-pointer" 
                   onClick={() => onSongClick(index, songs)}
                 >
                   <div className="text-gray-400 w-8 text-center mr-4">
                     {isPlayingNow ? <span className="text-spotify-green">▶</span> : 
                      isActive ? <span>⏸️</span> : 
                      <span>{index + 1}</span>}
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
                 
                 <span className="text-gray-400 mr-4">{formatTime(song.durationSeconds)}</span>
                 
                 {isPlaylist && (
                    <button 
                      onClick={() => handleRemoveSong(song)} 
                      className="bg-transparent border-none text-gray-400 cursor-pointer p-2 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="재생목록에서 삭제"
                    >
                      ✕
                    </button>
                 )}
               </li>
             );
           })
         ) : (
           <li className="text-gray-400 text-center py-8">이 목록에 곡이 없습니다.</li>
         )}
       </ul>

       {isOptionsOpen && (
          <div 
            className="fixed inset-0 z-[99]" 
            onClick={() => setIsOptionsOpen(false)}
          ></div>
       )}
     </div>
   );
};

export default PlaylistDetailView;