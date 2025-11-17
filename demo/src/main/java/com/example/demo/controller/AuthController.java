package com.example.demo.controller;

import com.example.demo.dto.UserJoinRequest;
import com.example.demo.dto.UserLoginRequest;
import com.example.demo.entity.User;
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
    
    // 🚨 [수정] 로그인 API: 토큰 대신 사용자 정보 (닉네임 등) 반환
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserLoginRequest request) {
        try {
            // 🚨 [수정] 반환 타입 String -> User
            User user = userService.login(request);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "로그인 성공!");
            // 🚨 [수정] 토큰 대신 닉네임과 이메일 반환 (예시)
            response.put("nickname", user.getNickname());
            response.put("email", user.getEmail());
            // (절대 비밀번호를 반환하면 안 됩니다!)
            
            return ResponseEntity.ok().body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("로그인 중 서버 오류가 발생했습니다.");
        }
    }
}
