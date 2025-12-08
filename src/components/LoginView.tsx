import React, { useState } from 'react';
// 🚨 [수정 1] 설정된 axiosConfig를 불러옵니다.
import axios from '../axiosConfig'; 
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToSignup: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      // 🚨 [수정 2] localhost 주소를 지우고 뒷부분만 남깁니다.
      // (axiosConfig에 있는 Ngrok 주소가 자동으로 붙습니다)
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (response.status === 200) {
        const userData: User = {
          userId: response.data.userId,
          email: response.data.email,
          nickname: response.data.nickname
        };
        alert(`${userData.nickname}님 환영합니다!`);
        onLoginSuccess(userData);
      }
    } catch (error: any) {
      console.error("로그인 실패:", error);
      // 에러 메시지 처리
      const errorMsg = error.response?.data?.error || error.response?.data || "로그인에 실패했습니다.";
      alert(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }
  };

  return (
    <div className="flex flex-col items-center h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-dark-bg overflow-hidden relative">
      {/* 배경 애니메이션 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-spotify-green/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* 앱 이름/로고 - 상단 중앙 */}
      <div className="relative z-10 mt-16 mb-8 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-spotify-green to-green-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-spotify-green/50 transform rotate-12 hover:rotate-0 transition-transform duration-500">
            <span className="text-4xl">🎵</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-spotify-green via-green-400 to-emerald-300 bg-clip-text text-transparent tracking-tight">
            MeloWave
          </h1>
        </div>
        <p className="text-gray-400 text-lg font-light">당신의 음악을 발견하세요</p>
      </div>

      {/* 로그인 폼 - 아래로 내림 */}
      <div className="relative z-10 w-full max-w-md px-8 py-10 bg-dark-card/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800/50 mt-8 animate-slide-up">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">로그인</h2>
          <p className="text-gray-400 text-sm">음악의 세계로 돌아오세요</p>
        </div>
        
        <div className="space-y-5">
          <div className="relative group">
            <input 
              type="email" 
              placeholder="이메일" 
              className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-spotify-green transition-all duration-300 hover:border-gray-600"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-spotify-green/0 to-green-400/0 group-focus-within:from-spotify-green/10 group-focus-within:to-green-400/10 pointer-events-none transition-all duration-300"></div>
          </div>
          <div className="relative group">
            <input 
              type="password" 
              placeholder="비밀번호" 
              className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-spotify-green transition-all duration-300 hover:border-gray-600"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-spotify-green/0 to-green-400/0 group-focus-within:from-spotify-green/10 group-focus-within:to-green-400/10 pointer-events-none transition-all duration-300"></div>
          </div>
        </div>

        <button 
          onClick={handleLogin} 
          className="w-full mt-6 py-3.5 bg-gradient-to-r from-spotify-green to-green-500 text-white font-bold rounded-xl hover:from-spotify-green-hover hover:to-green-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-spotify-green/30 hover:shadow-xl hover:shadow-spotify-green/50 relative overflow-hidden group"
        >
          <span className="relative z-10">로그인</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
        
        <button 
          onClick={onSwitchToSignup} 
          className="w-full mt-4 text-center text-gray-400 hover:text-white text-sm transition-colors underline-offset-2 hover:underline"
        >
          계정이 없으신가요? 회원가입
        </button>
      </div>
    </div>
  );
};

export default LoginView;