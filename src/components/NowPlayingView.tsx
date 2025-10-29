// src/components/NowPlayingView.tsx (예시)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Song, Playlist } from '../types'; // 타입 임포트

interface NowPlayingViewProps {
    song: Song;
    isPlaying: boolean;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onBackClick: () => void;
}

const NowPlayingView: React.FC<NowPlayingViewProps> = ({
    song, isPlaying, audioRef, onPlayPause, onNext, onPrev, onBackClick
}) => {
    // --- 탐색 바 상태 ---
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    // --- 재생목록에 추가 관련 상태 ---
    const [showPlaylistModal, setShowPlaylistModal] = useState(false); // 모달 표시 여부
    const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]); // 추가 가능한 내 플레이리스트 목록
    const [isAddingSong, setIsAddingSong] = useState(false); // 추가 작업 중 로딩 상태

    // 오디오 시간 업데이트 리스너
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (!isSeeking) setCurrentTime(audio.currentTime);
        };
        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        // 초기 duration 설정
        if(audio.readyState >= 1) { // METADATA 이상 로드된 경우
             setDuration(audio.duration);
        }

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [audioRef, isSeeking]);

    // 탐색 바 핸들러
    const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => { /* MusicPlayer와 동일 */
        if (audioRef.current) {
            const newTime = parseFloat(event.target.value);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };
    const handleSeekMouseDown = () => setIsSeeking(true);
    const handleSeekMouseUp = () => setIsSeeking(false);

    // 시간 포맷 함수
    const formatTime = (seconds: number): string => { /* MusicPlayer와 동일 */
       if (isNaN(seconds) || seconds < 0) return "0:00";
       const minutes = Math.floor(seconds / 60);
       const remainingSeconds = Math.floor(seconds % 60);
       return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // --- 재생목록에 추가 기능 ---

    // '추가' 버튼 클릭 시 모달 열기 및 플레이리스트 로드
    const handleOpenAddToPlaylist = async () => {
        setIsAddingSong(true);
        try {
            const response = await axios.get<Playlist[]>('https://localhost:8443/api/playlists');
            setAvailablePlaylists(Array.isArray(response.data) ? response.data : []);
            setShowPlaylistModal(true); // 모달 표시
        } catch (error) {
            console.error("플레이리스트 로드 실패:", error);
            alert("플레이리스트를 불러오는 데 실패했습니다.");
        } finally {
            setIsAddingSong(false);
        }
    };

    // 모달에서 플레이리스트 선택 시 곡 추가 API 호출
    const handleAddSongToSelectedPlaylist = async (playlistId: number) => {
        setIsAddingSong(true);
        try {
            // 백엔드 API 호출
            await axios.post(`https://localhost:8443/api/playlists/${playlistId}/songs`, {
                songId: song.songId // 현재 재생 중인 곡의 ID
            });
            alert('곡이 재생목록에 추가되었습니다.');
            setShowPlaylistModal(false); // 모달 닫기
        } catch (error) {
            console.error("재생목록에 곡 추가 실패:", error);
            alert('곡을 추가하는 데 실패했습니다.');
        } finally {
            setIsAddingSong(false);
        }
    };


    return (
        <div className="now-playing-container">
            {/* 뒤로가기 버튼 */}
            <button onClick={onBackClick} className="back-button-np">↓</button>

            {/* 큰 앨범 아트 */}
            <img src={song.albumCoverUrl || '/logo192.png'} alt="앨범 아트" className="album-art-large" />

            {/* 곡 정보 */}
            <div className="song-info-large">
                <h2>{song.title}</h2>
                <p>{/* 아티스트 이름 로드 필요 */} Artist ID: {song.artistId}</p>
            </div>

            {/* 탐색 바 */}
            <div className="progress-bar-container">
                <span className="time-display">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekMouseDown}
                    onMouseUp={handleSeekMouseUp}
                    className="seek-bar-large"
                    disabled={!duration}
                />
                <span className="time-display">{formatTime(duration)}</span>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="controls-large">
                <button className="control-button shuffle">🔀</button> {/* TODO: 셔플 기능 */}
                <button onClick={onPrev} className="control-button prev">⏮️</button>
                <button onClick={onPlayPause} className="control-button play-pause">
                    {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button onClick={onNext} className="control-button next">⏭️</button>
                <button className="control-button repeat">🔁</button> {/* TODO: 반복 기능 */}
            </div>

            {/* 추가 기능 버튼 (예: 좋아요, 재생목록 추가) */}
            <div className="now-playing-footer">
                <button className="like-button">🤍</button> {/* TODO: 좋아요 기능 */}
                {/* 🚨 재생목록에 추가 버튼 */}
                <button onClick={handleOpenAddToPlaylist} className="add-to-playlist-button" disabled={isAddingSong}>
                    {isAddingSong ? '로딩...' : '+'}
                </button>
                {/* 기타 버튼 */}
            </div>

            {/* 재생목록 선택 모달 (간단 버전) */}
            {showPlaylistModal && (
                <div className="playlist-modal-overlay" onClick={() => setShowPlaylistModal(false)}>
                    <div className="playlist-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>재생목록에 추가</h3>
                        {isAddingSong && <p>로딩 중...</p>}
                        <ul>
                            {availablePlaylists.length > 0 ? (
                                availablePlaylists.map(pl => (
                                    <li key={pl.playlistId} onClick={() => handleAddSongToSelectedPlaylist(pl.playlistId)}>
                                        {pl.title}
                                    </li>
                                ))
                            ) : (
                                <li>생성된 재생목록이 없습니다.</li>
                            )}
                        </ul>
                        <button onClick={() => setShowPlaylistModal(false)} className="modal-close-btn">닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NowPlayingView;