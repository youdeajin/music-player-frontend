import React, { useState } from 'react';
import axios from 'axios';
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
      // 🚨 [중요] 8080 포트 사용
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        email,
        password
      });

      if (response.status === 200) {
        // 🚨 [수정] 백엔드에서 받은 userId를 포함하여 User 객체 생성
        const userData: User = {
          userId: response.data.userId, // 백엔드의 AuthController가 이 값을 줘야 함
          email: response.data.email,
          nickname: response.data.nickname
        };
        alert(`${userData.nickname}님 환영합니다!`);
        onLoginSuccess(userData);
      }
    } catch (error: any) {
      console.error("로그인 실패:", error);
      alert(error.response?.data || "로그인에 실패했습니다.");
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