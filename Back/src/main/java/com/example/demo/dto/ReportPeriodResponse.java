package com.example.demo.dto;

public record ReportPeriodResponse(
	String period,
	Integer compareTime,
	Integer countAlertType
) {
}
