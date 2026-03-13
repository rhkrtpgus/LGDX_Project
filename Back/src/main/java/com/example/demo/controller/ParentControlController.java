package com.example.demo.controller;

import com.example.demo.dto.ChildWatchPolicyRequest;
import com.example.demo.dto.ChildWatchPolicyResponse;
import com.example.demo.dto.ParentAlertResponse;
import com.example.demo.dto.ParentChildResponse;
import com.example.demo.dto.ParentOverviewResponse;
import com.example.demo.dto.ParentViewingHistoryResponse;
import com.example.demo.service.ParentControlService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/parent")
public class ParentControlController {

	private final ParentControlService parentControlService;

	public ParentControlController(ParentControlService parentControlService) {
		this.parentControlService = parentControlService;
	}

	@GetMapping("/overview")
	public ParentOverviewResponse getOverview(@RequestParam(defaultValue = "1") int familyId) {
		try {
			return parentControlService.getOverview(familyId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@GetMapping("/children")
	public List<ParentChildResponse> getChildren(@RequestParam(defaultValue = "1") int familyId) {
		return parentControlService.getChildren(familyId);
	}

	@GetMapping("/watch-policy")
	public ChildWatchPolicyResponse getWatchPolicy(@RequestParam int childId) {
		try {
			return parentControlService.getWatchPolicy(childId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@PatchMapping("/watch-policy")
	public ChildWatchPolicyResponse updateWatchPolicy(@RequestBody ChildWatchPolicyRequest request) {
		try {
			return parentControlService.updateWatchPolicy(request);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@GetMapping("/viewing-history")
	public List<ParentViewingHistoryResponse> getViewingHistory(
		@RequestParam(defaultValue = "1") int familyId,
		@RequestParam(required = false) Integer childId,
		@RequestParam(defaultValue = "12") int limit
	) {
		return parentControlService.getViewingHistory(familyId, childId, limit);
	}

	@GetMapping("/alerts")
	public List<ParentAlertResponse> getAlerts(
		@RequestParam(defaultValue = "1") int familyId,
		@RequestParam(defaultValue = "12") int limit
	) {
		return parentControlService.getAlerts(familyId, limit);
	}
}
