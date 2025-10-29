import React, { useState } from 'react';
import axios from 'axios';

// --- 타입 정의 ---
// App.tsx로부터 받을 타입과 동일하게 정의합니다.
interface Song {
  songId: number;
  title: string;
  artistId: number;
  albumId: number;
  filePath: string;
  durationSeconds: number;
  genre: string;
}

// 채팅 메시지 구조 정의
interface Message {
  sender: 'user' | 'ai'; // 메시지 발신자 (사용자 또는 AI)
  text: string; // 메시지 내용
}

// --- Props 타입 정의 ---
// App.tsx로부터 추천 결과를 전달할 함수를 받습니다.
interface ChatbotProps {
    onRecommendationResult: (songs: Song[]) => void;
}

// --- Chatbot 컴포넌트 ---
// App 컴포넌트로부터 onRecommendationResult 함수를 props로 받습니다.
const Chatbot: React.FC<ChatbotProps> = ({ onRecommendationResult }) => {
  // --- 상태 변수 정의 ---
  const [messages, setMessages] = useState<Message[]>([]); // 채팅 메시지 목록
  const [input, setInput] = useState(''); // 사용자 입력값
  const [isLoading, setIsLoading] = useState(false); // AI 응답 대기 상태

  // --- 함수 정의 ---

  // AI 응답 텍스트("곡 제목 - 아티스트" 형식)를 파싱하여 곡 제목 목록 추출하는 함수
  const parseRecommendation = (text: string): string[] => {
      // 1. 응답 텍스트를 줄바꿈(\n) 기준으로 나눕니다.
      return text.split('\n')
                 // 2. 각 줄의 앞뒤 공백을 제거합니다.
                 .map(line => line.trim())
                 // 3. 비어있지 않은 줄만 필터링합니다.
                 .filter(line => line.length > 0)
                 // 4. " - " 기준으로 분리하여 첫 번째 부분(곡 제목)만 추출합니다.
                 .map(line => {
                     const parts = line.split(' - ');
                     // 제목 부분이 비어있지 않은 경우에만 반환
                     return parts[0]?.trim() || ''; // Optional chaining 사용
                 })
                 // 5. 유효한 제목만 필터링합니다.
                 .filter(title => title.length > 0);
  };

  // 백엔드 검색 API(/api/songs/search)를 호출하여 곡 제목으로 Song 객체를 찾는 함수
  const searchSongInDb = async (title: string): Promise<Song | null> => {
      try {
          // 백엔드 검색 API 호출 (query 파라미터로 제목 전달)
          const response = await axios.get<Song[]>(`https://localhost:8443/api/songs/search`, {
              params: { query: title }
          });
          // 검색 결과가 있고, 첫 번째 결과가 존재하면 해당 Song 객체 반환
          if (response.data && response.data.length > 0) {
              // TODO: 더 정확한 매칭 로직 추가 가능 (예: 제목 유사도 비교)
              // 현재는 첫 번째 검색 결과를 사용합니다.
              return response.data[0];
          }
          return null; // DB에서 해당 제목의 곡을 찾지 못함
      } catch (error) {
          console.error(`곡 검색 실패 (${title}):`, error);
          return null; // API 호출 실패 시 null 반환
      }
  };

  // 메시지 전송 버튼 클릭 또는 Enter 키 입력 시 호출되는 핸들러
  const handleSendMessage = async () => {
    // 입력값이 비어있으면 아무 작업도 하지 않음
    if (!input.trim()) return;

    // 사용자 메시지를 상태에 추가하고 화면에 표시
    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input; // 비동기 API 호출 전에 현재 입력값 저장
    setInput(''); // 입력창 비우기
    setIsLoading(true); // 로딩 상태 시작 (AI 응답 대기)

    try {
      // 백엔드 챗봇 API(/api/chatbot/recommend) 호출
      const response = await axios.post<string>('http://localhost:8080/api/chatbot/recommend', {
        prompt: currentInput // 저장된 입력값(사용자 요청) 전달
      });

      // 백엔드로부터 받은 AI 응답 텍스트
      const aiResponseText = response.data; // 응답 본문이 문자열이라고 가정
      const aiMessage: Message = { sender: 'ai', text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]); // AI 응답 메시지를 상태에 추가하고 화면에 표시

      // --- AI 추천 연동 로직 ---
      // AI 응답이 유효한 추천 텍스트인지 확인
      if (aiResponseText && !aiResponseText.includes("오류") && !aiResponseText.includes("못했습니다")) {
          // 1. AI 응답 파싱 -> 곡 제목 목록 추출
          const recommendedTitles = parseRecommendation(aiResponseText);
          console.log("AI 추천 곡 제목:", recommendedTitles); // 디버깅 로그

          // 2. 각 제목으로 백엔드 검색 API 병렬 호출
          const searchPromises = recommendedTitles.map(title => searchSongInDb(title));
          // 모든 검색 Promise가 완료될 때까지 기다리고, null이 아닌 결과(찾은 Song 객체)만 필터링
          const foundSongs = (await Promise.all(searchPromises)).filter(song => song !== null) as Song[];

          console.log("DB에서 찾은 추천 곡:", foundSongs); // 디버깅 로그

          // 3. 찾은 곡 목록(Song 객체 배열)을 App 컴포넌트로 전달 (Props 함수 호출)
          onRecommendationResult(foundSongs);
      } else {
          // AI 응답이 오류 메시지거나 유효하지 않으면 빈 배열 전달
          onRecommendationResult([]);
      }
      // --- 연동 로직 끝 ---

    } catch (error) {
      // 백엔드 API 호출 자체 실패 시
      console.error("AI 추천 요청 실패:", error);
      const errorMessage: Message = { sender: 'ai', text: "추천 생성 중 오류가 발생했습니다." };
      setMessages(prev => [...prev, errorMessage]); // 오류 메시지 표시
      onRecommendationResult([]); // 빈 배열 전달
    } finally {
      setIsLoading(false); // 로딩 상태 종료
    }
  };

  // --- 렌더링 로직 ---
  return (
    // 기본 CSS 클래스 적용
    <div className="chatbot-container">
      {/* 메시지 표시 영역 */}
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          // 각 메시지에 고유 key와 sender 클래스 적용
          <div key={index} className={`message ${msg.sender}`}>
            {/* AI 응답은 줄바꿈 문자(\n)를 <p> 태그로 변환하여 표시 */}
            {msg.sender === 'ai'
             ? msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)
             : msg.text}
          </div>
        ))}
        {/* 로딩 중일 때 표시 */}
        {isLoading && <div className="message ai">AI가 생각 중...</div>}
      </div>
      {/* 사용자 입력 영역 */}
      <div className="chatbot-input">
        <input
          type="text"
          value={input} // 입력값 상태 바인딩
          onChange={(e) => setInput(e.target.value)} // 입력 시 상태 업데이트
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()} // Enter 키로 전송
          placeholder="음악 추천 요청..."
          disabled={isLoading} // 로딩 중일 때 입력 비활성화
        />
        <button onClick={handleSendMessage} disabled={isLoading}>전송</button>
      </div>
    </div>
  );
};

export default Chatbot; // 컴포넌트 내보내기
