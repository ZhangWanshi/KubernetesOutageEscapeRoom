package com.team5.kubernetesoutageescaperoom.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity(name = "AppGameSession")
@Table(name = "game_sessions")
@Getter
@Setter
public class GameSession {
    @Id
    @Column(name = "session_code", length = 6)
    private String sessionCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameStatus status = GameStatus.WAITING;

    @Column(nullable = false)
    private int currentRoomId = 1;

    @Column(nullable = false)
    private int score = 100;

    @Column(nullable = false)
    private int serviceHealth = 100;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_players", joinColumns = @JoinColumn(name = "session_code"))
    @OrderColumn(name = "player_order")
    private List<Player> players = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "session_pending_players", joinColumns = @JoinColumn(name = "session_code"))
    @OrderColumn(name = "player_order")
    private List<Player> pendingPlayers = new ArrayList<>();

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private int wrongAttempts;

    @Column(nullable = false)
    private int hintsUsed;

    @Column(nullable = false)
    private int currentRoomHintsUsed;

    @Column(name = "room1_current_level", nullable = false)
    private int room1CurrentLevel = 1;

    @Column(name = "room1_completed", nullable = false)
    private boolean room1Completed;

    @Column(name = "room2_current_level", nullable = false)
    private int room2CurrentLevel = 1;

    @Column(name = "room2_completed", nullable = false)
    private boolean room2Completed;

    @Column(name = "room3_current_level", nullable = false)
    private int room3CurrentLevel = 1;

    @Column(name = "room3_completed", nullable = false)
    private boolean room3Completed;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "activity_feed", joinColumns = @JoinColumn(name = "session_code"))
    @OrderColumn(name = "event_order")
    private List<ActivityEvent> activityFeed = new ArrayList<>();
}
