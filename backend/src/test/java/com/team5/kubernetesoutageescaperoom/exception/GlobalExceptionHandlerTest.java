package com.team5.kubernetesoutageescaperoom.exception;

import com.team5.kubernetesoutageescaperoom.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFound_returns404() {
        ResponseEntity<ErrorResponse> response = handler.handleNotFound(new NotFoundException("not found"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().message()).isEqualTo("not found");
    }

    @Test
    void handleBadRequest_returns400() {
        ResponseEntity<ErrorResponse> response = handler.handleBadRequest(new BadRequestException("bad input"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().message()).isEqualTo("bad input");
    }

    @Test
    void handleConflict_returns409() {
        ResponseEntity<ErrorResponse> response = handler.handleConflict(new ConflictException("conflict"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().message()).isEqualTo("conflict");
    }
}
