package com.example.demo.controller;

import com.example.demo.dto.AdminOverviewResponse;
import com.example.demo.service.AdminOverviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminOverviewController {

	private final AdminOverviewService adminOverviewService;

	public AdminOverviewController(AdminOverviewService adminOverviewService) {
		this.adminOverviewService = adminOverviewService;
	}

	@GetMapping("/overview")
	public AdminOverviewResponse getOverview() {
		return adminOverviewService.getOverview();
	}
}
