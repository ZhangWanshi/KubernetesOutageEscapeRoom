package com.team5.kubernetesoutageescaperoom.repositories;

import com.team5.kubernetesoutageescaperoom.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionJpaRepository extends JpaRepository<GameSession, String> {
}
