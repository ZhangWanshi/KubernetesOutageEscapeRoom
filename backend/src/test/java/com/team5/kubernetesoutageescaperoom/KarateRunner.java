package com.team5.kubernetesoutageescaperoom;

import com.intuit.karate.junit5.Karate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class KarateRunner {

    @LocalServerPort
    int port;

    @Karate.Test
    Karate testAll() {
        return Karate.run("classpath:karate")
                .systemProperty("server.port", String.valueOf(port));
    }
}
