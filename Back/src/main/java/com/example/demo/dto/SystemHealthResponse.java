package com.example.demo.dto;

public record SystemHealthResponse(
	ComponentHealthResponse backend,
	ComponentHealthResponse database,
	ComponentHealthResponse mainModel,
	ComponentHealthResponse addictionModel,
	RuntimeSettingsResponse runtimeSettings
) {
}
