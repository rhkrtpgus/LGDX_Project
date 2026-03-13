package com.example.demo.domain;

public record WeeklyReport(
	int reportId,
	int familyId,
	Integer compareTime,
	Integer countAlertType
) {
}
