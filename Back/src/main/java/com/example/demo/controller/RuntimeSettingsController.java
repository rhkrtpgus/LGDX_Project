package com.example.demo.controller;

import com.example.demo.dto.RuntimeSettingsRequest;
import com.example.demo.dto.RuntimeSettingsResponse;
import com.example.demo.service.RuntimeSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/settings")
public class RuntimeSettingsController {

	private final RuntimeSettingsService runtimeSettingsService;

	public RuntimeSettingsController(RuntimeSettingsService runtimeSettingsService) {
		this.runtimeSettingsService = runtimeSettingsService;
	}

	@GetMapping("/runtime")
	public RuntimeSettingsResponse getRuntimeSettings() {
		return runtimeSettingsService.getCurrent();
	}

	@PatchMapping("/runtime")
	public RuntimeSettingsResponse updateRuntimeSettings(
		@RequestBody RuntimeSettingsRequest request
	) {
		try {
			return runtimeSettingsService.update(request);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}
}
