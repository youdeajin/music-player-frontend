import axios from 'axios';

// 개발 환경에서 자체 서명 인증서를 허용하기 위한 설정
// 주의: 프로덕션에서는 사용하지 마세요
if (process.env.NODE_ENV === 'development') {
  // Node.js 환경이 아닌 브라우저에서는 이 설정이 작동하지 않습니다
  // 브라우저는 자체 서명 인증서를 거부하므로, 사용자가 수동으로 허용해야 합니다
}

// axios 기본 설정
const axiosInstance = axios.create({
  // 👇 여기에 복사한 Ngrok 주소를 붙여넣으세요! (따옴표 안에)
  baseURL: 'https://unspirited-sheeplike-cheryle.ngrok-free.dev', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
  },
});

// 요청 인터셉터 - 에러 로깅
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 로깅
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      console.error('[API Error Response]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      // 요청이 전송되었지만 응답을 받지 못함
      console.error('[API Error Request]', {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
        code: error.code,
      });
    } else {
      // 요청 설정 중 에러
      console.error('[API Error]', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

