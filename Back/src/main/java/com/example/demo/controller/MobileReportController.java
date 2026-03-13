package com.example.demo.controller;

import com.example.demo.dto.MobileReportResponse;
import com.example.demo.dto.ReportFamilyResponse;
import com.example.demo.service.MobileReportService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/report")
public class MobileReportController {

	private final MobileReportService mobileReportService;

	public MobileReportController(MobileReportService mobileReportService) {
		this.mobileReportService = mobileReportService;
	}

	@GetMapping("/families")
	public List<ReportFamilyResponse> getFamilies() {
		return mobileReportService.getFamilies();
	}

	@GetMapping("/mobile")
	public MobileReportResponse getMobileReport(
		@RequestParam(defaultValue = "1") int familyId
	) {
		try {
			return mobileReportService.getMobileReport(familyId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}
}
