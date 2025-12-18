import React, { useState, useEffect, useRef } from 'react';
// 🚨 [수정] 설정된 axios 인스턴스 사용 (주소 자동 적용)
import axios from '../axiosConfig';
import { Song, Artist } from '../types';

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

      console.log("🎵 AI 추천 결과:", foundSongs);

      let aiResponseText: string;
      if (foundSongs.length > 0) {
          aiResponseText = "이런 곡들은 어떠세요?\n" +
              foundSongs.map(song => 
                `${song.title} - ${song.artistName || getArtistName(song.artistId)}`
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
    <div className={`fixed bottom-[100px] right-8 z-[1600] ${isOpen ? '' : ''}`}>
      {isOpen ? (
        <div className="w-[350px] h-[500px] bg-dark-card border border-gray-700 rounded-xl flex flex-col shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
          <button 
            onClick={toggleChat} 
            className="absolute top-2.5 right-4 bg-transparent border-none text-gray-400 text-2xl cursor-pointer z-10 hover:text-white transition-colors"
          >
            ×
          </button>
          <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-2.5 pt-10">
            {messages.length === 0 && !isLoading && (
              <>
                <div className="px-3.5 py-2.5 rounded-2xl max-w-[80%] leading-snug text-sm break-words bg-gray-700 text-gray-200 self-start rounded-bl-sm">
                  <p className="m-0">안녕하세요! 지금 기분이 어떠신가요? 사용자님의 기분에 맞춰 곡을 추천해드릴게요!</p>
                </div>
                <div className="flex flex-wrap gap-2 px-4 py-2.5">
                  <button 
                    onClick={() => handleSuggestionClick("신나는 댄스 음악 추천해줘", "신남 😄")} 
                    className="bg-gray-800 text-gray-300 border border-gray-600 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-all hover:bg-gray-600 hover:text-white hover:border-purple-600"
                  >
                    신남 😄
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("슬픈 발라드 추천해줘", "슬픔 😢")} 
                    className="bg-gray-800 text-gray-300 border border-gray-600 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-all hover:bg-gray-600 hover:text-white hover:border-purple-600"
                  >
                    슬픔 😢
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("화날 때 듣기 좋은 락 추천", "화남 😠")} 
                    className="bg-gray-800 text-gray-300 border border-gray-600 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-all hover:bg-gray-600 hover:text-white hover:border-purple-600"
                  >
                    화남 😠
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("편안한 재즈 음악 추천해줘", "편안함 😌")} 
                    className="bg-gray-800 text-gray-300 border border-gray-600 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-all hover:bg-gray-600 hover:text-white hover:border-purple-600"
                  >
                    편안함 😌
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("공부할 때 듣기 좋은 클래식", "집중 ✍️")} 
                    className="bg-gray-800 text-gray-300 border border-gray-600 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-all hover:bg-gray-600 hover:text-white hover:border-purple-600"
                  >
                    집중 ✍️
                  </button>
                </div>
              </>
            )}

            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`px-3.5 py-2.5 rounded-2xl max-w-[80%] leading-snug text-sm break-words ${
                  msg.sender === 'user' 
                    ? 'bg-purple-600 text-white self-end rounded-br-sm' 
                    : 'bg-gray-700 text-gray-200 self-start rounded-bl-sm'
                }`}
              >
                {msg.sender === 'ai'
                 ? msg.text.split('\n').map((line, i) => <p key={i} className="m-0">{line || '\u00A0'}</p>)
                 : msg.text}
              </div>
            ))}
            
            {isLoading && (
              <div className="px-3.5 py-2.5 rounded-2xl max-w-[80%] leading-snug text-sm break-words bg-gray-700 text-gray-200 self-start rounded-bl-sm">
                AI가 생각 중...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex p-2.5 border-t border-gray-700 bg-gray-900">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleInputSend()}
              placeholder="음악 추천 요청..."
              disabled={isLoading}
              className="flex-grow px-2.5 py-2.5 border border-gray-600 bg-gray-700 text-gray-200 rounded-full mr-2 outline-none focus:border-purple-600 disabled:opacity-50"
            />
            <button 
              onClick={handleInputSend} 
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white border-none rounded-full cursor-pointer font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={toggleChat} 
          className="w-15 h-15 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white border-none text-3xl cursor-pointer shadow-lg transition-all hover:scale-110 hover:rotate-12 hover:shadow-xl" 
          title="AI 챗봇 열기"
        >
          🤖
        </button>
      )}
    </div>
  );
};

export default Chatbot;