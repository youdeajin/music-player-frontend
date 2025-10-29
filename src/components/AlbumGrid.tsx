import React from 'react';

// 타입 정의 (App.tsx와 동일하게 가져오거나 types.ts에서 import)
interface Album {
  albumId: number;
  title: string;
  artistId: number; // 또는 아티스트 이름
  releaseDate?: string;
  coverUrl?: string;
}

interface Artist { // 아티스트 이름 표시를 위해 추가 (선택 사항)
    artistId: number;
    name: string;
}


// Props 타입 정의
interface AlbumGridProps {
    albums: Album[];
    artists: Artist[]; // 아티스트 목록 추가 (선택 사항)
    // 앨범 클릭 시 App.tsx의 함수 호출 (ID 전달)
    onAlbumClick: (albumId: number) => void;
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ albums, artists, onAlbumClick }) => {

    // 아티스트 ID를 이름으로 변환하는 헬퍼 함수 (선택 사항)
    const getArtistName = (artistId: number): string => {
        const artist = artists.find(a => a.artistId === artistId);
        return artist ? artist.name : `ID: ${artistId}`;
    };


    if (!albums || albums.length === 0) {
        return <p className="loading-text">표시할 앨범이 없습니다.</p>;
    }

    return (
        <div className="album-grid"> {/* Grid 레이아웃 컨테이너 */}
            {albums.map((album) => (
                <div
                    key={album.albumId}
                    className="album-item" // CSS 클래스
                    onClick={() => onAlbumClick(album.albumId)} // 클릭 시 onAlbumClick 호출
                >
                    {/* 앨범 커버 */}
                    <div className="album-cover-wrapper">
                        {album.coverUrl ? (
                            <img src={album.coverUrl} alt={`${album.title} 커버`} className="album-cover" />
                        ) : (
                            <div className="album-cover-placeholder"><span>💿</span></div>
                        )}
                    </div>
                    {/* 앨범 정보 */}
                    <p className="album-title">{album.title}</p>
                    {/* 아티스트 이름 표시 (artists props가 있을 경우) */}
                    <p className="album-artist">{getArtistName(album.artistId)}</p>
                </div>
            ))}
        </div>
    );
};

export default AlbumGrid;