// src/components/MiniPlayer.tsx
import React from 'react';
import { Song } from '../types';
import './MiniPlayer.css';

interface MiniPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onPlayPauseClick: () => void;
  onNextClick: () => void;
  onClick: () => void; // 미니 플레이어 클릭 시 전체 화면으로 전환
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ song, isPlaying, onPlayPauseClick, onNextClick, onClick }) => {
  if (!song) {
    return null; // 노래가 없으면 아무것도 렌더링하지 않음
  }

  // 다음 곡 버튼 클릭 시 이벤트 버블링 방지
  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 요소(미니 플레이어 전체)의 onClick 이벤트 방지
    onNextClick();
  };

   // 재생/일시정지 버튼 클릭 시 이벤트 버블링 방지
   const handlePlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayPauseClick();
  };


  return (
    <div className="mini-player" onClick={onClick}>
      <img src={song.albumCoverUrl || '/logo192.png'} alt="Album cover" className="mini-player-cover" />
      <div className="mini-player-info">
        <p className="mini-player-title">{song.title}</p>
        <p className="mini-player-artist">{song.artistName || `Artist ID ${song.artistId}`}</p>
      </div>
      <div className="mini-player-controls">
        <button onClick={handlePlayPauseClick} className="mini-player-button">
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button onClick={handleNextClick} className="mini-player-button">⏭️</button>
      </div>
    </div>
  );
};

export default MiniPlayer;