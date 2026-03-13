package com.example.demo.dto;

import java.time.LocalDateTime;

public record MobileReportResponse(
	Integer familyId,
	String familyName,
	ReportPeriodResponse daily,
	ReportPeriodResponse weekly,
	ReportPeriodResponse monthly,
	LocalDateTime generatedAt
) {
}
