import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { User, Song } from '../types';

interface AdminViewProps {
  onBackClick: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ onBackClick }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'songs'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    artistId: '',
    albumId: '',
    filePath: '',
    durationSeconds: '',
    genre: ''
  });

  // 관리자 인증
  const handleAdminAuth = async () => {
    if (!adminPassword.trim()) {
      setPasswordError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await axios.post('/api/admin/auth', { password: adminPassword });
      if (response.data.success) {
        setIsAuthenticated(true);
        setPasswordError('');
        // 세션 스토리지에 인증 상태 저장
        sessionStorage.setItem('adminAuthenticated', 'true');
        loadUsers();
        loadSongs();
      } else {
        setPasswordError('비밀번호가 일치하지 않습니다.');
      }
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || '인증 중 오류가 발생했습니다.');
    }
  };

  // 세션 스토리지에서 인증 상태 확인
  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadUsers();
      loadSongs();
    }
  }, []);

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      alert('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 곡 목록 로드
  const loadSongs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/songs');
      setSongs(response.data.songs || []);
    } catch (error) {
      console.error('곡 목록 로드 실패:', error);
      alert('곡 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId: number, email: string) => {
    if (!window.confirm(`정말로 사용자 '${email}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      alert('사용자 삭제 완료!');
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || '사용자 삭제 중 오류가 발생했습니다.');
    }
  };

  // 곡 삭제
  const handleDeleteSong = async (songId: number, title: string) => {
    if (!window.confirm(`정말로 곡 '${title}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await axios.delete(`/api/admin/songs/${songId}`);
      alert('곡 삭제 완료!');
      loadSongs();
    } catch (error: any) {
      alert(error.response?.data?.error || '곡 삭제 중 오류가 발생했습니다.');
    }
  };

  // 곡 수정 시작
  const handleStartEdit = (song: Song) => {
    setEditingSong(song);
    setEditForm({
      title: song.title || '',
      artistId: song.artistId?.toString() || '',
      albumId: song.albumId?.toString() || '',
      filePath: song.filePath || '',
      durationSeconds: song.durationSeconds?.toString() || '',
      genre: song.genre || ''
    });
  };

  // 곡 수정 저장
  const handleSaveEdit = async () => {
    if (!editingSong) return;

    try {
      await axios.put(`/api/admin/songs/${editingSong.songId}`, {
        title: editForm.title || null,
        artistId: editForm.artistId ? parseInt(editForm.artistId) : null,
        albumId: editForm.albumId ? parseInt(editForm.albumId) : null,
        filePath: editForm.filePath || null,
        durationSeconds: editForm.durationSeconds ? parseInt(editForm.durationSeconds) : null,
        genre: editForm.genre || null
      });
      alert('곡 정보 수정 완료!');
      setEditingSong(null);
      loadSongs();
    } catch (error: any) {
      alert(error.response?.data?.error || '곡 정보 수정 중 오류가 발생했습니다.');
    }
  };

  // 곡 수정 취소
  const handleCancelEdit = () => {
    setEditingSong(null);
    setEditForm({
      title: '',
      artistId: '',
      albumId: '',
      filePath: '',
      durationSeconds: '',
      genre: ''
    });
  };

  // 로그아웃
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuthenticated');
    setAdminPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-dark-card/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700/50">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">관리자 페이지</h2>
          <p className="text-gray-400 text-center mb-6">관리자 비밀번호를 입력하세요</p>
          
          <div className="mb-4">
            <input
              type="password"
              placeholder="관리자 비밀번호"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setPasswordError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAdminAuth();
                }
              }}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent"
            />
            {passwordError && (
              <p className="text-red-400 text-sm mt-2">{passwordError}</p>
            )}
          </div>

          <button
            onClick={handleAdminAuth}
            className="w-full py-3 bg-spotify-green text-white rounded-lg font-semibold hover:bg-spotify-green-hover transition-colors mb-4"
          >
            로그인
          </button>

          <button
            onClick={onBackClick}
            className="w-full py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackClick}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 font-semibold"
            >
              <span>←</span>
              <span>뒤로가기</span>
            </button>
            <h1 className="text-4xl font-bold text-white">관리자 페이지</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'users'
                ? 'text-spotify-green border-b-2 border-spotify-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👥 사용자 관리
          </button>
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'songs'
                ? 'text-spotify-green border-b-2 border-spotify-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎵 곡 관리
          </button>
        </div>

        {/* 콘텐츠 */}
        {loading && (
          <div className="text-center py-8 text-gray-400">로딩 중...</div>
        )}

        {activeTab === 'users' && !loading && (
          <div className="bg-dark-card rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">사용자 계정 관리</h2>
              <p className="text-sm text-gray-400 mt-1">등록된 사용자 목록을 조회하고 삭제할 수 있습니다.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">이메일</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">닉네임</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">가입일</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm">{user.userId}</td>
                      <td className="px-6 py-4 text-sm">{user.email}</td>
                      <td className="px-6 py-4 text-sm">{user.nickname}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(user.userId, user.email)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-400">사용자가 없습니다.</div>
            )}
          </div>
        )}

        {activeTab === 'songs' && !loading && (
          <div className="bg-dark-card rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">곡 정보 관리</h2>
              <p className="text-sm text-gray-400 mt-1">등록된 곡 목록을 조회하고 수정/삭제할 수 있습니다.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">제목</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">아티스트 ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">앨범 ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">파일 경로</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song) => (
                    <React.Fragment key={song.songId}>
                      <tr className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm">{song.songId}</td>
                        <td className="px-6 py-4 text-sm">{song.title}</td>
                        <td className="px-6 py-4 text-sm">{song.artistId || '-'}</td>
                        <td className="px-6 py-4 text-sm">{song.albumId || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-xs">
                          {song.filePath || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(song)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteSong(song.songId, song.title)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingSong?.songId === song.songId && (
                        <tr className="bg-gray-800/30">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-gray-400 mb-1">제목</label>
                                <input
                                  type="text"
                                  value={editForm.title}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-400 mb-1">아티스트 ID</label>
                                <input
                                  type="number"
                                  value={editForm.artistId}
                                  onChange={(e) => setEditForm({ ...editForm, artistId: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-400 mb-1">앨범 ID</label>
                                <input
                                  type="number"
                                  value={editForm.albumId}
                                  onChange={(e) => setEditForm({ ...editForm, albumId: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-400 mb-1">파일 경로</label>
                                <input
                                  type="text"
                                  value={editForm.filePath}
                                  onChange={(e) => setEditForm({ ...editForm, filePath: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-400 mb-1">재생 시간 (초)</label>
                                <input
                                  type="number"
                                  value={editForm.durationSeconds}
                                  onChange={(e) => setEditForm({ ...editForm, durationSeconds: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-400 mb-1">장르</label>
                                <input
                                  type="text"
                                  value={editForm.genre}
                                  onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-spotify-green text-white rounded hover:bg-spotify-green-hover transition-colors"
                              >
                                저장
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {songs.length === 0 && (
              <div className="text-center py-8 text-gray-400">곡이 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;

