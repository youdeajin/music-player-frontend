package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "USERS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 기본 생성자
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq_gen")
    @SequenceGenerator(name = "user_seq_gen", sequenceName = "USERS_SEQ", allocationSize = 1)
    private Long userId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String nickname;
    
    @Column(name = "JOINED_AT")
    private LocalDateTime joinedAt;

    // 🚨 [필수 수정 1] 회원가입 시 ID를 제외하고 데이터를 주입하기 위한 생성자 (Builder 대체)
    // UserService에서 이 생성자를 직접 호출하도록 코드를 변경해야 합니다.
    public User(String email, String password, String nickname, LocalDateTime joinedAt) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.joinedAt = joinedAt;
    }

    // 🚨 [필수 수정 2] JPA가 모든 필드를 채워서 객체를 로드하기 위한 전체 필드 생성자
    public User(Long userId, String email, String password, String nickname, LocalDateTime joinedAt) {
        this.userId = userId;
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.joinedAt = joinedAt;
    }
}