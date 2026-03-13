package com.example.demo.service;

import com.example.demo.dto.AdminOverviewResponse;
import com.example.demo.repository.DashboardMapper;
import com.example.demo.repository.ParentControlMapper;
import org.springframework.stereotype.Service;

@Service
public class AdminOverviewService {

	private final DashboardMapper dashboardMapper;
	private final ParentControlMapper parentControlMapper;

	public AdminOverviewService(
		DashboardMapper dashboardMapper,
		ParentControlMapper parentControlMapper
	) {
		this.dashboardMapper = dashboardMapper;
		this.parentControlMapper = parentControlMapper;
	}

	public AdminOverviewResponse getOverview() {
		return new AdminOverviewResponse(
			dashboardMapper.countUsers(),
			dashboardMapper.countChildren(),
			dashboardMapper.countViewings(),
			dashboardMapper.countAlerts(),
			parentControlMapper.countPolicies(),
			parentControlMapper.countHighRiskAlerts(),
			parentControlMapper.findAlertsByFamilyId(1, 6)
		);
	}
}
