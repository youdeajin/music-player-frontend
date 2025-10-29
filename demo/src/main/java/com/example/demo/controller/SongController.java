package com.example.demo.controller;

import com.example.demo.entity.Song;
import com.example.demo.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/songs")
@RequiredArgsConstructor
public class SongController {

    private final SongService songService;

    // React 프론트엔드(localhost:3000)에서 백엔드(localhost:8080)로의 접속 허용
    @CrossOrigin(origins = "http://localhost:3000") 
    @GetMapping
    public ResponseEntity<List<Song>> getAllSongs() {
        List<Song> songs = songService.findAllSongs();
        return ResponseEntity.ok(songs);
    }
    
    // 특정 곡 정보 조회 API (재생에 필요한 file_path를 가져감)
    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/{songId}")
    public ResponseEntity<Song> getSongDetail(@PathVariable Long songId) {
        try {
            Song song = songService.findSongById(songId);
            return ResponseEntity.ok(song);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}