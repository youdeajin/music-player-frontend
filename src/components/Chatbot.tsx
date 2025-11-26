import React, { useState, useEffect, useRef } from 'react';
// 🚨 [수정] 설정된 axios 인스턴스 사용 (주소 자동 적용)
import axios from '../axiosConfig';
import { Song, Artist } from '../types';
import './Chatbot.css';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface ChatbotProps {
    onRecommendationResult: (songs: Song[], prompt: string) => void;
    allArtists: Artist[];
}

const Chatbot: React.FC<ChatbotProps> = ({ onRecommendationResult, allArtists }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getArtistName = (artistId: number): string => {
      const artist = allArtists.find(a => a.artistId === artistId);
      return artist ? artist.name : `ID ${artistId}`;
  };

  const fetchAiResponse = async (promptToSend: string) => {
    setIsLoading(true);

    try {
      // 🚨 [수정] axiosConfig 사용 (주소 단축, HTTPS 지원)
      const response = await axios.post<Song[]>('/api/chatbot/recommend', {
        prompt: promptToSend
      });

      const foundSongs = response.data;

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
      setMessages(prev => [...prev, aiMessage]);

      onRecommendationResult(foundSongs, promptToSend); 

    } catch (error) {
      console.error("AI 추천 요청 실패:", error);
      const errorMessage: Message = { sender: 'ai', text: "추천 생성 중 오류가 발생했습니다." };
      setMessages(prev => [...prev, errorMessage]);
      onRecommendationResult([], promptToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionPrompt: string, chipText: string) => {
    if (isLoading) return;

    const userMessage: Message = { sender: 'user', text: chipText };
    setMessages(prev => [...prev, userMessage]);

    fetchAiResponse(suggestionPrompt);
  };

  const handleInputSend = () => {
    if (!input.trim() || isLoading) return;

    const promptToSend = input;
    const userMessage: Message = { sender: 'user', text: promptToSend };
    setMessages(prev => [...prev, userMessage]);
    
    setInput('');
    fetchAiResponse(promptToSend);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isOpen) { 
        setMessages([]); 
        setInput('');
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  return (
    <div className={`chatbot-wrapper ${isOpen ? 'open' : 'closed'}`}>
      {isOpen ? (
        <div className="chatbot-container">
          <button onClick={toggleChat} className="chat-close-btn">×</button>
          <div className="chatbot-messages">
            {messages.length === 0 && !isLoading && (
              <>
                <div className="message ai">
                  <p>안녕하세요! 지금 기분이 어떠신가요? 사용자님의 기분에 맞춰 곡을 추천해드릴게요!</p>
                </div>
                <div className="suggestion-chips-container">
                  <button onClick={() => handleSuggestionClick("신나는 댄스 음악 추천해줘", "신남 😄")} className="suggestion-chip">신남 😄</button>
                  <button onClick={() => handleSuggestionClick("슬픈 발라드 추천해줘", "슬픔 😢")} className="suggestion-chip">슬픔 😢</button>
                  <button onClick={() => handleSuggestionClick("화날 때 듣기 좋은 락 추천", "화남 😠")} className="suggestion-chip">화남 😠</button>
                  <button onClick={() => handleSuggestionClick("편안한 재즈 음악 추천해줘", "편안함 😌")} className="suggestion-chip">편안함 😌</button>
                  <button onClick={() => handleSuggestionClick("공부할 때 듣기 좋은 클래식", "집중 ✍️")} className="suggestion-chip">집중 ✍️</button>
                </div>
              </>
            )}

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

          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleInputSend()}
              placeholder="음악 추천 요청..."
              disabled={isLoading}
            />
            <button onClick={handleInputSend} disabled={isLoading}>전송</button>
          </div>
        </div>
      ) : (
        <button onClick={toggleChat} className="chat-open-btn" title="AI 챗봇 열기">
          🤖
        </button>
      )}
    </div>
  );
};

export default Chatbot;