package com.example.demo.repository;

import com.example.demo.entity.Song;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongRepository extends JpaRepository<Song, Long> {
    // JpaRepository를 상속받으면 findById(), findAll() 등의 메서드를 자동으로 사용할 수 있습니다.
}