import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

interface SignupViewProps {
  onSwitchToLogin: () => void;
}

const SignupView: React.FC<SignupViewProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSignup = async () => {
    if (!email || !password || !nickname) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    try {
      // 🚨 [수정] 주소 변경 (8443 -> 8080, https -> http)
      await axios.post('http://localhost:8080/api/auth/join', {
        email,
        password,
        nickname
      });
      
      alert('회원가입 성공! 로그인해주세요.');
      onSwitchToLogin(); // 로그인 화면으로 전환
    } catch (error: any) {
      console.error("회원가입 실패:", error);
      alert(error.response?.data || "회원가입 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">회원가입</h2>
        <input 
          type="email" placeholder="이메일" className="auth-input"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" placeholder="비밀번호" className="auth-input"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <input 
          type="text" placeholder="닉네임" className="auth-input"
          value={nickname} onChange={(e) => setNickname(e.target.value)}
        />
        <button onClick={handleSignup} className="auth-button">가입하기</button>
        <button onClick={onSwitchToLogin} className="auth-switch-btn">
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </div>
  );
};

export default SignupView;