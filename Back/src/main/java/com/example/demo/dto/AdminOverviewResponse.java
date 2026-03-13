package com.example.demo.dto;

import java.util.List;

public record AdminOverviewResponse(
	int familyCount,
	int childCount,
	int viewingCount,
	int alertCount,
	int policyCount,
	int highRiskAlertCount,
	List<ParentAlertResponse> recentAlerts
) {
}
