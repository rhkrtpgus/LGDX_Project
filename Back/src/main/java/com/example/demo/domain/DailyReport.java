package com.example.demo.domain;

public record DailyReport(
	int reportId,
	int familyId,
	Integer compareTime,
	Integer countAlertType
) {
}
