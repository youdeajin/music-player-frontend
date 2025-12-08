import React, { useState } from 'react';
// 🚨 [수정 1] 설정된 axiosConfig를 불러와야 Ngrok 주소가 적용됩니다!
import axios from '../axiosConfig'; 
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
      // 🚨 [수정 2] 앞에 주소를 지우고 뒷부분만 남깁니다.
      // (axiosConfig에 설정된 Ngrok 주소가 자동으로 앞에 붙습니다)
      await axios.post('/api/auth/join', {
        email,
        password,
        nickname
      });
      
      alert('회원가입 성공! 로그인해주세요.');
      onSwitchToLogin(); // 로그인 화면으로 전환
    } catch (error: any) {
      console.error("회원가입 실패:", error);
      // 에러 메시지 처리 강화
      const errorMsg = error.response?.data || "회원가입 중 오류가 발생했습니다.";
      alert(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
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