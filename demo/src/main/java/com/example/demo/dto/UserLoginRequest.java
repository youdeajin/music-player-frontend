package com.example.demo.dto;

import lombok.Getter;
import lombok.Setter;

// 로그인 요청 DTO
@Getter
@Setter
public class UserLoginRequest {
    private String email;
    private String password;
}