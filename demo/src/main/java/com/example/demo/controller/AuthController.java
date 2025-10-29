package com.example.demo.controller;

import com.example.demo.dto.UserJoinRequest;
import com.example.demo.dto.UserLoginRequest;
import com.example.demo.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    // 회원가입 API (기존 코드)
    @PostMapping("/join")
    public ResponseEntity<?> join(@RequestBody UserJoinRequest request) {
        try {
            userService.join(request);
            return ResponseEntity.ok().body("회원가입이 성공적으로 완료되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    // 🚨 로그인 API: POST /api/auth/login (토큰 반환)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserLoginRequest request) {
        try {
            // UserService에서 JWT 토큰을 발급받습니다.
            String token = userService.login(request);
            
            // 프론트엔드가 토큰을 쉽게 저장할 수 있도록 JSON 형태로 반환
            Map<String, String> response = new HashMap<>();
            response.put("message", "로그인 성공!");
            response.put("token", token);
            
            return ResponseEntity.ok().body(response);
        } catch (IllegalArgumentException e) {
            // 이메일 또는 비밀번호 불일치 시 401 Unauthorized 반환
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("로그인 중 서버 오류가 발생했습니다.");
        }
    }
}
