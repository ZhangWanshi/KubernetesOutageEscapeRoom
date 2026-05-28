package com.team5.kubernetesoutageescaperoom.repositories;

import com.team5.kubernetesoutageescaperoom.entities.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<GameSession, String> {
}
