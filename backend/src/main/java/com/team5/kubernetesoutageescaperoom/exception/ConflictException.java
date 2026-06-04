package com.team5.kubernetesoutageescaperoom.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
