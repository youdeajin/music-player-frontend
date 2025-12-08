import React, { useState } from 'react';
// 🚨 [수정 1] 설정된 axiosConfig를 불러옵니다.
import axios from '../axiosConfig'; 
import { User } from '../types';
import './Auth.css';

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
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">로그인</h2>
        <input 
          type="email" placeholder="이메일" className="auth-input"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" placeholder="비밀번호" className="auth-input"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="auth-button">로그인</button>
        <button onClick={onSwitchToSignup} className="auth-switch-btn">
          계정이 없으신가요? 회원가입
        </button>
      </div>
    </div>
  );
};

export default LoginView;