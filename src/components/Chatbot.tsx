import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Song, Artist } from '../types'; // 🚨 Artist 타입 임포트
import './Chatbot.css';

// 채팅 메시지 구조 정의
interface Message {
  sender: 'user' | 'ai'; // 메시지 발신자 (사용자 또는 AI)
  text: string; // 메시지 내용
}

// Props 타입 정의
interface ChatbotProps {
    onRecommendationResult: (songs: Song[], prompt: string) => void;
    allArtists: Artist[]; // 🚨 App으로부터 전체 아티스트 목록 받기
}

// --- Chatbot 컴포넌트 ---
const Chatbot: React.FC<ChatbotProps> = ({ onRecommendationResult, allArtists }) => {
  // --- 상태 변수 (기존 유지) ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 헬퍼 함수 ---
  
  // 아티스트 ID를 이름으로 변환
  const getArtistName = (artistId: number): string => {
      const artist = allArtists.find(a => a.artistId === artistId);
      return artist ? artist.name : `ID ${artistId}`;
  };

  // --- 챗봇 로직 함수 ---

  /**
   * 🚨 [로직 수정] AI에게 실제 프롬프트를 보내고 응답을 처리하는 함수
   * (이 함수는 더 이상 사용자 메시지를 화면에 추가하지 않습니다.)
   */
  const fetchAiResponse = async (promptToSend: string) => {
    setIsLoading(true); // 로딩 시작

    try {
      // 백엔드 챗봇 API 호출
      const response = await axios.post<Song[]>('http://localhost:8080/api/chatbot/recommend', {
        prompt: promptToSend
      });

      const foundSongs = response.data; // 백엔드가 반환한 Song 객체 배열

      // AI 응답 메시지 생성
      let aiResponseText: string;
      if (foundSongs.length > 0) {
          aiResponseText = "이런 곡들은 어떠세요?\n" +
              foundSongs.map(song => 
                `${song.title} - ${getArtistName(song.artistId)}`
              ).join('\n');
      } else {
          aiResponseText = "죄송합니다. 요청에 맞는 곡을 DB에서 찾지 못했습니다.";
      }
      
      const aiMessage: Message = { sender: 'ai', text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]); // AI 응답 메시지 표시

      // App.tsx로 Song 객체 배열과 원본 프롬프트(promptToSend) 전달
      onRecommendationResult(foundSongs, promptToSend); 

    } catch (error) {
      console.error("AI 추천 요청 실패:", error);
      const errorMessage: Message = { sender: 'ai', text: "추천 생성 중 오류가 발생했습니다." };
      setMessages(prev => [...prev, errorMessage]);
      onRecommendationResult([], promptToSend);
    } finally {
      setIsLoading(false); // 로딩 상태 종료
    }
  };

  /**
   * 🚨 [새로 추가] 추천 답변 버튼 클릭 핸들러
   * @param suggestionPrompt AI에게 보낼 실제 프롬프트 (예: "신나는 댄스 음악")
   * @param chipText 사용자가 클릭한 버튼 텍스트 (예: "신남 😄")
   */
  const handleSuggestionClick = (suggestionPrompt: string, chipText: string) => {
    if (isLoading) return; // 로딩 중이면 중단

    // 1. 사용자가 클릭한 버튼 텍스트("신남 😄")를 유저 메시지로 표시
    const userMessage: Message = { sender: 'user', text: chipText };
    setMessages(prev => [...prev, userMessage]);

    // 2. 실제 프롬프트("신나는 댄스 음악...")로 AI 응답 요청
    fetchAiResponse(suggestionPrompt);
  };

  /**
   * 🚨 [새로 추가] 입력창 전송 핸들러
   */
  const handleInputSend = () => {
    if (!input.trim() || isLoading) return;

    const promptToSend = input;
    
    // 1. 사용자가 입력한 텍스트를 유저 메시지로 표시
    const userMessage: Message = { sender: 'user', text: promptToSend };
    setMessages(prev => [...prev, userMessage]);
    
    setInput(''); // 입력창 비우기

    // 2. 입력한 텍스트로 AI 응답 요청
    fetchAiResponse(promptToSend);
  };


  // 챗봇 창 열기/닫기 토글 함수 (닫을 때 메시지 초기화)
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isOpen) { 
        setMessages([]); 
        setInput('');
        setIsLoading(false);
    }
  };

  // 메시지 목록 자동 스크롤 효과
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // --- 렌더링 로직 ---
  return (
    <div className={`chatbot-wrapper ${isOpen ? 'open' : 'closed'}`}>
      {isOpen ? (
        // --- 챗봇 창이 열려 있을 때 ---
        <div className="chatbot-container">
          <button onClick={toggleChat} className="chat-close-btn">×</button>
          <div className="chatbot-messages">

            {/* AI 초기 질문 및 추천 버튼 */}
            {messages.length === 0 && !isLoading && (
              <>
                <div className="message ai">
                  <p>안녕하세요! 지금 기분이 어떠신가요? 사용자님의 기분에 맞춰 곡을 추천해드릴게요!</p>
                </div>
                {/* 🚨 [수정] onClick 핸들러 변경 */}
                <div className="suggestion-chips-container">
                  <button onClick={() => handleSuggestionClick("신나는 댄스 음악 추천해줘", "신남 😄")} className="suggestion-chip">신남 😄</button>
                  <button onClick={() => handleSuggestionClick("슬픈 발라드 추천해줘", "슬픔 😢")} className="suggestion-chip">슬픔 😢</button>
                  <button onClick={() => handleSuggestionClick("화날 때 듣기 좋은 락 추천", "화남 😠")} className="suggestion-chip">화남 😠</button>
                  <button onClick={() => handleSuggestionClick("편안한 재즈 음악 추천해줘", "편안함 😌")} className="suggestion-chip">편안함 😌</button>
                  <button onClick={() => handleSuggestionClick("공부할 때 듣기 좋은 클래식", "집중 ✍️")} className="suggestion-chip">집중 ✍️</button>
                </div>
              </>
            )}

            {/* 기존 메시지 목록 렌더링 */}
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.sender === 'ai'
                 ? msg.text.split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)
                 : msg.text}
              </div>
            ))}
            
            {isLoading && <div className="message ai">AI가 생각 중...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* 🚨 [수정] 사용자 입력 영역 핸들러 변경 */}
          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleInputSend()} // 👈 handleInputSend 호출
              placeholder="음악 추천 요청..."
              disabled={isLoading}
            />
            <button onClick={handleInputSend} disabled={isLoading}>전송</button> {/* 👈 handleInputSend 호출 */}
          </div>
        </div>
      ) : (
        // --- 챗봇 창이 닫혀 있을 때 ---
        <button onClick={toggleChat} className="chat-open-btn" title="AI 챗봇 열기">
          🤖
        </button>
      )}
    </div>
  );
};

export default Chatbot;

