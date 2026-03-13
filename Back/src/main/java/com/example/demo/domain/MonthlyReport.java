package com.example.demo.domain;

public record MonthlyReport(
	int reportId,
	int familyId,
	Integer compareTime,
	Integer countAlertType
) {
}
