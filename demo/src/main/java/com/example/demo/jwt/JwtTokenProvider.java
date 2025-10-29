package com.example.demo.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.InitializingBean; // 🚨 InitializingBean import
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

// 🚨 InitializingBean 인터페이스 구현
@Component
public class JwtTokenProvider implements InitializingBean {

    @Value("${jwt.secret}")
    private String secretKey;

    private final long tokenValidityInMilliseconds = 3600000; // 1시간

    public JwtTokenProvider() {
        // 기본 생성자 유지
    }
    
    // 🚨 [새로운 수정] afterPropertiesSet 메서드 구현 (InitializingBean 인터페이스)
    @Override
    public void afterPropertiesSet() throws Exception {
        // 빈 생성 후 secretKey가 유효한지 확인
        if (secretKey == null || secretKey.length() < 32) {
            // 키가 없거나 길이가 너무 짧으면 서버 구동을 중단합니다.
            throw new IllegalStateException("JWT secret key must be set in application.properties and must be at least 32 characters long for HS256.");
        }
    }
    
    // 시크릿 키를 바이트 배열로 변환
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 사용자 ID(userId)를 기반으로 JWT 토큰을 생성합니다.
     * @param userId 사용자 고유 ID
     * @return 생성된 JWT 문자열
     */
    public String createToken(Long userId) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + tokenValidityInMilliseconds);

        return Jwts.builder()
                .setSubject(userId.toString()) // 토큰 주체: 사용자 ID
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
}
