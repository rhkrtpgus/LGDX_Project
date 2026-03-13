package com.example.demo.dto;

public record AddictionMonitorResponse(
	boolean enabled,
	boolean consentGranted,
	boolean executed,
	String status,
	String message
) {
}
