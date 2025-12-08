import React, { useState, useEffect, useRef } from 'react';
import axios from '../axiosConfig';
import axiosLib from 'axios';
// types.ts 파일에서 공유 타입 임포트
import { Song, Playlist, Artist } from '../types';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon } from './Icons';

// App.tsx로부터 전달받을 Props 타입 정의
interface NowPlayingViewProps {
    song: Song; // 현재 재생 중인 곡 (App.tsx에서 artistName, albumCoverUrl이 채워져서 옴)
    isPlaying: boolean; // 현재 재생 상태
    audioRef: React.RefObject<HTMLAudioElement | null>; // App.tsx의 오디오 요소 참조 (null 허용)
    onPlayPause: () => void; // 재생/일시정지 토글 함수
    onNext: () => void; // 다음 곡 함수
    onPrev: () => void; // 이전 곡 함수
    onBackClick: () => void; // 라이브러리 뷰로 돌아가기 함수
}

// 시간 포맷 유틸리티 함수 (초 -> MM:SS)
const formatTime = (seconds: number): string => {
   // 숫자가 아니거나 음수이면 00:00 반환
   if (isNaN(seconds) || seconds < 0) return "0:00";
   const minutes = Math.floor(seconds / 60); // 분
   const remainingSeconds = Math.floor(seconds % 60); // 초
   // 두 자리 숫자로 포맷팅
   return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};


// --- NowPlayingView 컴포넌트 ---
const NowPlayingView: React.FC<NowPlayingViewProps> = ({
    song, isPlaying, audioRef, onPlayPause, onNext, onPrev, onBackClick
}) => {
    // --- 상태 변수 정의 ---
    const [currentTime, setCurrentTime] = useState(0); // 현재 재생 시간 (탐색 바용)
    const [duration, setDuration] = useState(0); // 곡 전체 길이 (탐색 바용)
    const [isSeeking, setIsSeeking] = useState(false); // 사용자가 탐색 바를 드래그 중인지 여부

    // "재생목록에 추가" 모달 관련 상태
    const [showPlaylistModal, setShowPlaylistModal] = useState(false); // 모달 표시 여부
    const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]); // 추가 가능한 플레이리스트 목록
    const [isAddingSong, setIsAddingSong] = useState(false); // 곡 추가 API 호출 중 로딩 상태

    // 아티스트 이름 상태 (prop으로 받은 song.artistName 사용)
    const [artistName, setArtistName] = useState(song.artistName || `ID ${song.artistId}`);

    // --- Effect 훅 ---
    
    // 곡(song prop)이 변경될 때마다 아티스트 이름 상태 업데이트
    useEffect(() => {
        // App.tsx에서 song 객체에 artistName을 이미 매핑해줬으므로 바로 사용
        setArtistName(song.artistName || `ID ${song.artistId}`);
    }, [song]); // song 객체가 변경될 때마다 실행

    // 오디오 시간/메타데이터 리스너
    // audioRef(App.tsx의 <audio> 요소)의 이벤트를 감지하여 탐색 바 상태 업데이트
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return; // 오디오 요소가 없으면 중단

        // 시간 업데이트 이벤트 핸들러
        const handleTimeUpdate = () => {
            // 사용자가 탐색 바를 드래그하고 있지 않을 때만 시간 업데이트
            if (!isSeeking) {
                setCurrentTime(audio.currentTime);
            }
        };
        // 메타데이터 로드 완료 이벤트 핸들러 (곡 길이 설정)
        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };
        
        // 컴포넌트 마운트 시 또는 audioRef 변경 시 오디오 요소의 현재 상태 반영
        if(audio.readyState >= 1) { // METADATA 이상 로드된 경우
             setDuration(audio.duration);
             setCurrentTime(audio.currentTime);
        }

        // 이벤트 리스너 등록
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        // 클린업 함수: 컴포넌트 언마운트 시 리스너 제거
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [audioRef, isSeeking]); // isSeeking 상태가 변경될 때도 리스너 재설정

    // --- 탐색 바 핸들러 ---
    // 슬라이더 값 변경 시 (드래그 중)
    const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = parseFloat(event.target.value);
            audioRef.current.currentTime = newTime; // 오디오 재생 시간 즉시 변경
            setCurrentTime(newTime); // 슬라이더 위치(UI) 즉시 변경
        }
    };
    // 슬라이더 누르기 시작 시
    const handleSeekMouseDown = () => setIsSeeking(true);
    // 슬라이더에서 손 뗄 시
    const handleSeekMouseUp = () => setIsSeeking(false);

    // --- "재생목록에 추가" 기능 핸들러 ---

    // '+' 버튼 클릭 시 모달 열기 및 플레이리스트 목록 로드
    const handleOpenAddToPlaylist = async () => {
        setIsAddingSong(true); // 로딩 시작
        setShowPlaylistModal(true); // 모달 표시
        try {
            // 백엔드 API 호출하여 모든 재생목록 가져오기
            const response = await axios.get<Playlist[]>('/api/playlists');
            setAvailablePlaylists(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("플레이리스트 로드 실패:", error);
            alert("플레이리스트를 불러오는 데 실패했습니다.");
            setShowPlaylistModal(false); // 오류 시 모달 닫기
        } finally {
            setIsAddingSong(false); // 로딩 종료
        }
    };

    // 모달에서 특정 플레이리스트 선택 시 곡 추가 API 호출
    const handleAddSongToSelectedPlaylist = async (playlistId: number) => {
        setIsAddingSong(true); // 버튼 로딩 상태
        try {
            // 백엔드 API 호출 (POST /api/playlists/{id}/songs)
            await axios.post(`/api/playlists/${playlistId}/songs`, {
                songId: song.songId // 현재 재생 중인 곡의 ID
            });
            alert('곡이 재생목록에 추가되었습니다.');
            setShowPlaylistModal(false); // 모달 닫기
        } catch (error) {
            console.error("재생목록에 곡 추가 실패:", error);
            if (axiosLib.isAxiosError(error) && error.response?.status === 400) {
                 alert('곡을 추가하는 데 실패했습니다. (이미 목록에 있을 수 있습니다)');
            } else {
                 alert('곡을 추가하는 데 실패했습니다.');
            }
        } finally {
            setIsAddingSong(false);
        }
    };


    // --- 렌더링 로직 ---
    return (
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-dark-bg via-gray-800 to-dark-bg flex flex-col items-center justify-center p-8 box-border text-gray-200 z-[2000]">
            {/* 헤더: 뒤로가기 버튼 */}
            <div className="absolute top-8 left-8">
                <button 
                  onClick={onBackClick} 
                  className="bg-white/10 border-none rounded-full w-10 h-10 text-white text-2xl cursor-pointer flex justify-center items-center transition-colors hover:bg-white/20"
                >
                    ↓
                </button>
            </div>

            {/* 큰 앨범 아트 */}
            <img 
              src={song.albumCoverUrl || '/logo192.png'} 
              alt="앨범 아트" 
              className={`w-80 h-80 rounded-full object-cover mb-8 shadow-2xl ${isPlaying ? 'animate-spin-slow' : ''}`}
              style={{ animationDuration: '20s' }}
            />

            {/* 곡 정보 */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold mb-2 text-white">{song.title}</h2>
                {/* 🚨 [수정] artistId 대신 artistName 상태 변수 사용 */}
                <p className="text-xl text-gray-400">{artistName}</p>
            </div>

            {/* 탐색 바 */}
            <div className="w-full max-w-lg flex items-center gap-4 mb-8">
                <span className="text-sm text-gray-400 min-w-[40px]">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration && !isNaN(duration) ? duration : 0} // duration 유효성 검사
                    value={currentTime}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekMouseDown}
                    onMouseUp={handleSeekMouseUp}
                    className="flex-grow h-1.5 appearance-none bg-gray-600 rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    disabled={!duration || duration === 0} // 곡 없거나 길이 0이면 비활성화
                />
                <span className="text-sm text-gray-400 min-w-[40px]">{formatTime(duration)}</span>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center gap-6 mb-12">
                <button className="bg-gray-800/60 hover:bg-gray-700/80 border-none text-white cursor-pointer p-3 rounded-full transition-all duration-300 hover:scale-110 hover:text-spotify-green hover:shadow-lg hover:shadow-spotify-green/30 active:scale-95 flex items-center justify-center w-14 h-14 backdrop-blur-sm group">
                    <ShuffleIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button> {/* TODO: 셔플 기능 */}
                <button 
                  onClick={onPrev} 
                  className="bg-gray-800/60 hover:bg-gray-700/80 border-none text-white cursor-pointer p-3 rounded-full transition-all duration-300 hover:scale-110 hover:text-spotify-green hover:shadow-lg hover:shadow-spotify-green/30 active:scale-95 flex items-center justify-center w-14 h-14 backdrop-blur-sm group"
                >
                    <PrevIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={onPlayPause} 
                  className="bg-white hover:bg-gray-100 text-black rounded-full w-24 h-24 flex justify-center items-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-2xl hover:shadow-3xl relative overflow-hidden group"
                >
                    <span className="relative z-10 flex items-center justify-center">
                        {isPlaying ? (
                            <PauseIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
                        ) : (
                            <PlayIcon className="w-10 h-10 ml-1 group-hover:scale-110 transition-transform" />
                        )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/20 group-hover:via-white/10 group-hover:to-white/20 transition-all duration-300 rounded-full"></div>
                </button>
                <button 
                  onClick={onNext} 
                  className="bg-gray-800/60 hover:bg-gray-700/80 border-none text-white cursor-pointer p-3 rounded-full transition-all duration-300 hover:scale-110 hover:text-spotify-green hover:shadow-lg hover:shadow-spotify-green/30 active:scale-95 flex items-center justify-center w-14 h-14 backdrop-blur-sm group"
                >
                    <NextIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                <button className="bg-gray-800/60 hover:bg-gray-700/80 border-none text-white cursor-pointer p-3 rounded-full transition-all duration-300 hover:scale-110 hover:text-spotify-green hover:shadow-lg hover:shadow-spotify-green/30 active:scale-95 flex items-center justify-center w-14 h-14 backdrop-blur-sm group">
                    <RepeatIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button> {/* TODO: 반복 기능 */}
            </div>

            {/* 추가 기능 버튼 (좋아요, 재생목록 추가) */}
            <div className="flex gap-8">
                {<button className="bg-transparent border-none text-gray-400 text-2xl cursor-pointer hover:text-spotify-green transition-colors"></button> /* TODO: 좋아요 기능 */}
                <button 
                  onClick={handleOpenAddToPlaylist} 
                  className="bg-transparent border-none text-gray-400 text-2xl cursor-pointer hover:text-spotify-green transition-colors disabled:opacity-50" 
                  disabled={isAddingSong} 
                  title="재생목록에 추가"
                >
                    {isAddingSong ? '...' : '+'}
                </button>
            </div>

            {/* 재생목록 선택 모달 (showPlaylistModal이 true일 때만 표시) */}
            {showPlaylistModal && (
                <div 
                  className="fixed inset-0 bg-black/70 flex justify-center items-center z-[3000]" 
                  onClick={() => setShowPlaylistModal(false)}
                >
                    {/* 모달 컨텐츠 클릭 시 닫힘 방지 */}
                    <div 
                      className="bg-dark-card rounded-lg p-6 w-96 max-h-[500px] shadow-2xl border border-gray-700" 
                      onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-4">재생목록에 추가</h3>
                        {/* 목록 로딩 중 표시 */}
                        {isAddingSong && <p className="text-center my-4 text-gray-400">로딩 중...</p>}
                        <ul className="list-none p-0 m-0 max-h-[300px] overflow-y-auto">
                            {!isAddingSong && availablePlaylists.length > 0 ? (
                                availablePlaylists.map(pl => (
                                    <li 
                                      key={pl.playlistId} 
                                      onClick={() => handleAddSongToSelectedPlaylist(pl.playlistId)}
                                      className="px-4 py-3 text-gray-200 cursor-pointer hover:bg-gray-700 rounded transition-colors"
                                    >
                                        {pl.title}
                                    </li>
                                ))
                            ) : !isAddingSong ? (
                                <li className="px-4 py-3 text-gray-400 text-center">생성된 재생목록이 없습니다.</li>
                            ) : null}
                        </ul>
                        <button 
                          onClick={() => setShowPlaylistModal(false)} 
                          className="w-full mt-4 px-4 py-2 bg-gray-700 text-white border-none rounded cursor-pointer hover:bg-gray-600 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NowPlayingView;

