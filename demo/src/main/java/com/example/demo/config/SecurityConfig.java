package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // 비밀번호 암호화 빈
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 보안 필터 체인 설정
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 비활성화 (REST API 환경)
            .csrf(AbstractHttpConfigurer::disable)
            // CORS 설정 (CorsFilter를 사용하여 처리하므로 Spring Security의 CORS는 비활성화)
            .cors(c -> c.disable()) 
            
            // HTTP 요청 인가 규칙 설정
            .authorizeHttpRequests(authorize -> authorize
                // 회원가입, 로그인, 곡 조회 API는 인증 없이 허용 (Public)
                .requestMatchers("/api/auth/join", "/api/auth/login", "/api/songs", "/api/songs/*").permitAll()
                // 그 외 모든 요청은 인증 필요
                .anyRequest().authenticated()
            );

        // JWT 등 토큰 기반 인증 방식을 위해 폼 로그인 비활성화
        http.formLogin(AbstractHttpConfigurer::disable);

        return http.build();
    }
    
    // CORS 필터 설정
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // 개발 환경 설정
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*"); // 모든 출처 허용
        config.addAllowedHeader("*");        // 모든 헤더 허용
        config.addAllowedMethod("*");        // 모든 HTTP 메서드 허용
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
