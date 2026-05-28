package com.team5.kubernetesoutageescaperoom.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Development security configuration for the escape room project.
 *
 * This allows the simple browser frontend and API endpoints to be used without
 * Spring Security redirecting users to the default /login page.
 *
 * For a production version, replace this with proper authentication and
 * explicit authorisation rules.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/styles.css",
                                "/app.js",
                                "/api/**"
                        ).permitAll()
                        .anyRequest().permitAll()
                );

        return http.build();
    }
}
