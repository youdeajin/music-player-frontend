package com.example.demo.service;

import com.example.demo.dto.UserJoinRequest;
import com.example.demo.dto.UserLoginRequest;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public User join(UserJoinRequest request) {
        userRepository.findByEmail(request.getEmail())
            .ifPresent(user -> {
                throw new IllegalArgumentException("이미 존재하는 이메일입니다.");
            });

        User user = new User(
            request.getEmail(),
            request.getPassword(), 
            request.getNickname(),
            LocalDateTime.now()
        );
            
        return userRepository.save(user);
    }

    /**
     * 🚨 [수정] 로그인 처리 로직: 토큰 대신 User 객체 반환
     */
    @Transactional(readOnly = true)
    public User login(UserLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new IllegalArgumentException("이메일이 일치하지 않습니다."));
        
      
        if (!request.getPassword().equals(user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        
        return user; 
    }
}