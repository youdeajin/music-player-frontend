package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "SONGS") // 테이블 이름은 SONGS (대문자)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "song_seq_gen")
    // DB의 SONGS_SEQ 시퀀스와 연결
    @SequenceGenerator(name = "song_seq_gen", sequenceName = "SONGS_SEQ", allocationSize = 1)
    private Long songId;

    private String title;
    
    // DB에서 artist_id를 직접 참조하는 필드. 실제 엔티티 관계는 2단계에서 고도화 가능.
    @Column(name = "ARTIST_ID")
    private Long artistId; 

    @Column(name = "ALBUM_ID")
    private Long albumId;
    
    @Column(name = "FILE_PATH", nullable = false)
    private String filePath;

    @Column(name = "DURATION_SECONDS")
    private Integer durationSeconds;

    private String genre;

    // 참고: 실제 개발에서는 Artist, Album 엔티티와 @ManyToOne 관계로 연결해야 합니다.
}