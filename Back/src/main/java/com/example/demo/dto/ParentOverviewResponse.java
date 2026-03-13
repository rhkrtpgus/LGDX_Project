package com.example.demo.dto;

import java.util.List;

public record ParentOverviewResponse(
	Integer familyId,
	String familyName,
	Integer todayViewingCount,
	Integer alertCount,
	List<ParentChildResponse> children,
	MobileReportResponse report,
	List<ParentAlertResponse> recentAlerts
) {
}
