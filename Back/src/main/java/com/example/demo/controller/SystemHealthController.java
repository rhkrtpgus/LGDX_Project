package com.example.demo.controller;

import com.example.demo.dto.SystemHealthResponse;
import com.example.demo.service.SystemHealthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemHealthController {

	private final SystemHealthService systemHealthService;

	public SystemHealthController(SystemHealthService systemHealthService) {
		this.systemHealthService = systemHealthService;
	}

	@GetMapping("/health")
	public SystemHealthResponse getHealth() {
		return systemHealthService.getHealth();
	}
}
