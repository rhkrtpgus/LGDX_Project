package com.example.demo.dto;

public record RuntimeSettingsRequest(
	Boolean privacyConsent,
	Boolean addictionMonitorEnabled
) {
}
