package com.example.demo.dto;

import java.util.List;

public record DashboardOverviewResponse(
	int userCount,
	int childCount,
	int viewingCount,
	int alertCount,
	List<RecentAlertResponse> recentAlerts
) {
}
