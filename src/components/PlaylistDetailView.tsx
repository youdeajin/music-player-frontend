import React, { useState, useEffect } from 'react';
import axios from 'axios';
// types.ts 파일에서 공유 타입 임포트
import { Song, Playlist, Album, Artist, PlaylistDetail } from '../types';

// App.tsx로부터 전달받을 Props 타입 정의
interface PlaylistDetailViewProps {
  playlistId: number | null; // 플레이리스트 ID (둘 중 하나만 존재)
  albumId: number | null;    // 앨범 ID (둘 중 하나만 존재)
  onSongClick: (index: number, songs: Song[]) => void; // 곡 클릭 시 재생 함수
  onBackClick: () => void; // 뒤로가기 함수
  currentSongId?: number; // 현재 재생 중인 곡 ID (하이라이트용)
  isPlaying: boolean; // 현재 재생 상태 (아이콘 표시용)
  
  // 앨범 뷰의 '전체 재생' 시 App.tsx의 함수를 호출하기 위해 필요
  loadAlbumSongsToPlayer: (albumId: number, albumTitle: string) => Promise<void>; 
  
  // 🚨 [새로 추가] App.tsx로부터 전체 앨범/아티스트/삭제 함수 받기
  allAlbums: Album[]; // 곡 목록의 앨범 커버 매핑용
  allArtists: Artist[]; // 곡 목록의 아티스트 이름 매핑용
  onDeletePlaylist: (playlistId: number, playlistTitle: string) => Promise<void>; // 재생목록 삭제 함수
}

// 앨범 또는 플레이리스트의 상세 정보를 담을 타입 (통합)
// 🚨 Album 타입에도 songs 필드를 추가하여 통합 (artistName은 선택적)
type DetailItem = (PlaylistDetail) | (Album & { songs: Song[], artistName?: string });


const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlistId,
  albumId,
  onSongClick,
  onBackClick,
  currentSongId,
  isPlaying,
  loadAlbumSongsToPlayer, // prop 받기
  // 🚨 [새로 추가] props 받기
  allAlbums,
  allArtists,
  onDeletePlaylist
}) => {
  // --- 상태 변수 ---
  const [details, setDetails] = useState<DetailItem | null>(null); // 앨범 또는 플레이리스트 상세 정보
  const [songs, setSongs] = useState<Song[]>([]); // 🚨 상세 뷰에 표시될 곡 목록 (정보 가공됨)
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState<string | null>(null);
  
  // 🚨 [새로 추가] '더보기(...)' 옵션 메뉴 상태
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // --- 데이터 로딩 Effect ---
  useEffect(() => {
    // 상세 뷰가 열릴 때마다 '더보기' 메뉴 닫기
    setIsOptionsOpen(false);

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      setDetails(null); // 이전 데이터 초기화
      setSongs([]);
      
      try {
        // 🚨 아티스트 정보는 App.tsx에서 props로 받으므로 내부 fetch 제거

        if (playlistId) {
          // --- 플레이리스트 상세 정보 로드 ---
          const response = await axios.get<PlaylistDetail>(`https://localhost:8443/api/playlists/${playlistId}`);
          const playlistData = response.data;
          
          // 🚨 [수정] 곡 목록에 앨범 커버 URL 및 아티스트 이름 매핑 (props 활용)
          const processedSongs = (playlistData.songs || []).map(song => {
              const album = allAlbums.find(a => a.albumId === song.albumId);
              const artist = allArtists.find(a => a.artistId === song.artistId);
              return {
                  ...song,
                  albumCoverUrl: album?.coverUrl || '/logo192.png',
                  artistName: artist?.name || `ID ${song.artistId}`
              };
          });
          
          setDetails({ ...playlistData, songs: processedSongs }); // 가공된 songs 포함
          setSongs(processedSongs);
          
        } else if (albumId) {
          // --- 앨범 상세 정보 로드 ---
          const [albumRes, songsRes] = await Promise.all([
            axios.get<Album>(`https://localhost:8443/api/albums/${albumId}`), // 1. 앨범 자체 정보
            axios.get<Song[]>(`https://localhost:8443/api/albums/${albumId}/songs`) // 2. 앨범 수록곡 목록
          ]);
          
          const loadedSongs = songsRes.data || [];
          const albumArtist = allArtists.find(a => a.artistId === albumRes.data.artistId);
          
          // 🚨 [수정] 앨범 곡 목록에도 커버 URL 및 아티스트 이름 매핑 (props 활용)
           const processedSongs = loadedSongs.map(song => {
              const artist = allArtists.find(a => a.artistId === song.artistId);
              // 앨범 곡이므로 앨범 커버는 앨범 정보(albumRes.data)에서 가져옴
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
      } catch (err: any) { // 'err' 타입 명시
        console.error("데이터 로딩 실패:", err);
        setError("데이터를 불러오는데 실패했습니다: " + err.message);
      } finally {
        setIsLoading(false); // 로딩 종료
      }
    };

    fetchDetails();
  // 🚨 allAlbums, allArtists를 의존성 배열에 추가 (props 변경 시 재실행)
  }, [playlistId, albumId, allAlbums, allArtists]);

  // --- 헬퍼 함수 ---
  
  // 아티스트 ID를 이름으로 변환 (props 사용)
  const getArtistName = (artistId: number): string => {
    const artist = allArtists.find(a => a.artistId === artistId); // 🚨 props 사용
    return artist ? artist.name : `아티스트 ID ${artistId}`;
  };

  // 시간 포맷 (MM:SS)
  const formatTime = (seconds: number): string => {
      if (isNaN(seconds) || seconds < 0) return "0:00";
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // --- 이벤트 핸들러 ---
  
  // '전체 재생' 버튼 클릭 시 (큐를 현재 목록으로 교체하고 0번부터 재생)
  const handlePlayAll = () => {
    if (songs.length > 0) {
        onSongClick(0, songs);
    }
  };

  // '셔플 재생' 버튼 클릭 시
  const handleShufflePlay = () => {
      if (songs.length > 0) {
          const shuffledSongs = [...songs].sort(() => Math.random() - 0.5); // 복사 후 셔플
          onSongClick(0, shuffledSongs); // 셔플된 목록으로 재생 시작
      }
  };

  // 재생목록에서 특정 곡 삭제 핸들러 (기존)
  const handleRemoveSong = async (songToRemove: Song) => {
    if (!playlistId || !details) {
        alert("앨범에서는 곡을 삭제할 수 없습니다.");
        return;
    }
    
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`'${details.title}' 재생목록에서 '${songToRemove.title}'을(를) 삭제하시겠습니까?`)) {
        try {
            await axios.delete(`https://localhost:8443/api/playlists/${playlistId}/songs/${songToRemove.songId}`);
            // 상태 즉시 업데이트
            const updatedSongs = songs.filter(s => s.songId !== songToRemove.songId);
            setSongs(updatedSongs);
            setDetails({ ...details, songs: updatedSongs });
            alert("곡이 재생목록에서 삭제되었습니다.");
        } catch (error) {
            console.error("재생목록 곡 삭제 실패:", error);
            alert("곡 삭제 중 오류가 발생했습니다.");
        }
    }
  };
  
  // 🚨 [새로 추가] 재생목록 자체를 삭제하는 핸들러
  const handleDeleteThisPlaylist = () => {
    if (playlistId && details) {
        // App.tsx로부터 받은 삭제 함수 호출
        onDeletePlaylist(playlistId, details.title);
        setIsOptionsOpen(false); // 옵션 메뉴 닫기
    }
  };


  // --- 렌더링 로직 ---
  
  if (isLoading || !details) {
    return (
      <div className="playlist-detail-container loading-state">
        <button onClick={onBackClick} className="back-button">←</button>
        <p>{isLoading ? "데이터 로딩 중..." : (error ? error : "정보를 찾을 수 없습니다.")}</p>
        {error && <button onClick={onBackClick}>뒤로가기</button>}
      </div>
    );
  }

  // 렌더링 정보 추출
  const title = details.title;
  const coverUrl = details.coverUrl || '/logo192.png';
  
  // 🚨 타입 가드: 'createdAt' 속성이 details 객체 안에 있는지 확인 (PlaylistDetail 타입인지)
  const isPlaylist = 'createdAt' in details; 

  const subTitle = isPlaylist
      // PlaylistDetail일 경우:
      ? `${songs.length}곡 · 생성일 ${new Date(details.createdAt || Date.now()).toLocaleDateString()}`
      // Album일 경우:
      : getArtistName(details.artistId); // 👈 앨범은 artistId가 있음

  return (
    <div className="playlist-detail-container">
      {/* --- 상단 헤더 --- */}
      <div className="playlist-detail-header">
         <button onClick={onBackClick} className="back-button">←</button>
         <img src={coverUrl} alt={title} className="playlist-detail-cover" />
         <h2 className="playlist-detail-title">{title}</h2>
         <p className="playlist-detail-description">{subTitle}</p>
         <div className="playlist-detail-actions">
           <button onClick={handlePlayAll} className="play-button" disabled={songs.length === 0}>▶ Play</button>
           <button onClick={handleShufflePlay} className="shuffle-button" disabled={songs.length === 0}>🔀 Shuffle</button>
           
           {/* 🚨 [수정] '더보기' 버튼 (플레이리스트일 때만 표시) */}
           {isPlaylist && (
             <div className="options-menu-container"> {/* 위치 기준점 */}
               <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="options-button">⋮</button>
               
               {/* 옵션 드롭다운 메뉴 (열려있을 때만) */}
               {isOptionsOpen && (
                 <div className="playlist-options-menu">
                   <button onClick={handleDeleteThisPlaylist} className="options-menu-item delete">
                     재생목록 삭제
                   </button>
                   {/* <button className="options-menu-item">제목 수정</button> */}
                 </div>
               )}
             </div>
           )}
         </div>
       </div>

       {/* --- 곡 목록 --- */}
       <ul className="playlist-detail-songs">
         {songs.length > 0 ? (
           songs.map((song, index) => {
             // 현재 재생 중인 곡인지 확인
             const isActive = (currentSongId === song.songId);
             const isPlayingNow = isActive && isPlaying;
             
             return (
               <li
                 key={`detail-song-${song.songId}-${index}`}
                 className={`song-item ${isActive ? 'active' : ''}`}
               >
                 {/* 곡 정보 클릭 영역 (재생) */}
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
                   {/* 🚨 [수정] song.albumCoverUrl 사용 (props 매핑으로 해결) */}
                   <img src={song.albumCoverUrl || '/logo192.png'} alt="커버" className="song-item-cover-small" />
                   <div className="song-item-info">
                     <p className="song-item-title">{song.title}</p>
                     {/* 🚨 [수정] getArtistName(song.artistId) 사용 (props 매핑으로 해결) */}
                     <p className="song-item-subtitle">{getArtistName(song.artistId)}</p>
                   </div>
                 </div>
                 
                 {/* 곡 길이 */}
                 <span className="song-item-duration">{formatTime(song.durationSeconds)}</span>
                 
                 {/* 곡 삭제 버튼 (플레이리스트 뷰일 때만 표시) */}
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

       {/* 옵션 메뉴가 열렸을 때 메뉴 바깥 영역 클릭 시 닫기 (선택적) */}
       {isOptionsOpen && (
          <div className="modal-click-outside" onClick={() => setIsOptionsOpen(false)}></div>
       )}
     </div>
   );
};

// 밖을 클릭해도 닫히도록 하는 스타일 (선택적)
const ModalClickOutside: React.FC<{onClick: () => void}> = ({onClick}) => {
    return (
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                zIndex: 99 /* 메뉴보다 아래 */ 
            }} 
            onClick={onClick}
        ></div>
    );
};


export default PlaylistDetailView;

