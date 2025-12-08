// src/components/MiniPlayer.tsx
import React from 'react';
import { Song } from '../types';
import { PlayIcon, PauseIcon, NextIcon } from './Icons';

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
    <div 
      className="fixed bottom-0 left-0 w-full h-20 bg-gray-900 border-t border-gray-800 flex items-center px-6 box-border z-[1500] shadow-2xl transition-colors hover:bg-gray-800 cursor-pointer group"
      onClick={onClick}
    >
      <img 
        src={song.albumCoverUrl || '/logo192.png'} 
        alt="Album cover" 
        className="w-14 h-14 rounded-md object-cover mr-4 bg-gray-700 shadow-md group-hover:shadow-lg transition-shadow" 
      />
      <div className="flex-grow mr-4 cursor-pointer">
        <p className="text-base font-semibold text-white m-0 mb-1 truncate">{song.title}</p>
        <p className="text-sm text-gray-400 m-0 truncate">{song.artistName || `Artist ID ${song.artistId}`}</p>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={handlePlayPauseClick} 
          className="bg-gray-800/80 hover:bg-gray-700 border-none text-white cursor-pointer p-2.5 rounded-full transition-all duration-300 hover:scale-110 hover:text-spotify-green hover:shadow-lg hover:shadow-spotify-green/30 active:scale-95 flex items-center justify-center w-12 h-12 group"
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          ) : (
            <PlayIcon className="w-5 h-5 ml-0.5 group-hover:scale-110 transition-transform" />
          )}
        </button>
        <button 
          onClick={handleNextClick} 
          className="bg-gray-800/80 hover:bg-gray-700 border-none text-white cursor-pointer p-2.5 rounded-full transition-all duration-300 hover:scale-110 hover:text-spotify-green hover:shadow-lg hover:shadow-spotify-green/30 active:scale-95 flex items-center justify-center w-12 h-12 group"
        >
          <NextIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default MiniPlayer;