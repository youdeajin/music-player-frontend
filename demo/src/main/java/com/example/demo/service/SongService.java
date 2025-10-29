package com.example.demo.service;


import com.example.demo.entity.Song;
import com.example.demo.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SongService {

    private final SongRepository songRepository;

    // 모든 곡 목록 조회 (재생목록 구성에 사용)
    @Transactional(readOnly = true)
    public List<Song> findAllSongs() {
        return songRepository.findAll();
    }

    // 특정 곡 상세 정보 조회 (재생 요청 시 사용)
    @Transactional(readOnly = true)
    public Song findSongById(Long songId) {
        return songRepository.findById(songId)
                .orElseThrow(() -> new IllegalArgumentException("Song not found with ID: " + songId));
    }
}